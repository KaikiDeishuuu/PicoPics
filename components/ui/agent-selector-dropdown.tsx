"use client";

import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import {
  ChevronDown,
  Globe,
  Server,
  Wifi,
  Check,
  X,
  Plus,
  Edit3,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Agent = {
  id: string;
  name: string;
  url: string;
  status?: "online" | "offline" | "unknown";
  lastSeen?: Date;
  location?: {
    ip?: string;
    country?: string;
  };
  uuid?: string;
  apiKey?: string;
};

// 主题样式映射
const themeStyles = {
  dark: {
    bg: "bg-neutral-800/80",
    border: "border-neutral-700",
    text: "text-gray-100",
    hover: "hover:bg-neutral-700/80",
    selected: "bg-blue-900/20 ring-1 ring-blue-400/40",
    dropdown: "bg-neutral-800 border-neutral-700",
    empty: "text-gray-400",
  },
  light: {
    bg: "bg-white",
    border: "border-gray-300",
    text: "text-gray-900",
    hover: "hover:bg-gray-50",
    selected: "bg-blue-50 ring-1 ring-blue-400/40",
    dropdown: "bg-white border-gray-200",
    empty: "text-gray-500",
  },
};

// 工具函数 - 提取到组件外部避免重复创建
const getCountryFlag = (country: string): string => {
  const flags: { [key: string]: string } = {
    US: "🇺🇸",
    JP: "🇯🇵",
    CN: "🇨🇳",
    GB: "🇬🇧",
    DE: "🇩🇪",
    FR: "🇫🇷",
    CA: "🇨🇦",
    AU: "🇦🇺",
    KR: "🇰🇷",
    SG: "🇸🇬",
    HK: "🇭🇰",
    TW: "🇹🇼",
    IN: "🇮🇳",
    BR: "🇧🇷",
    RU: "🇷🇺",
    IT: "🇮🇹",
    ES: "🇪🇸",
    NL: "🇳🇱",
    SE: "🇸🇪",
    NO: "🇳🇴",
    DK: "🇩🇰",
    FI: "🇫🇮",
    CH: "🇨🇭",
    AT: "🇦🇹",
    BE: "🇧🇪",
    IE: "🇮🇪",
    PT: "🇵🇹",
    GR: "🇬🇷",
    PL: "🇵🇱",
    CZ: "🇨🇿",
    HU: "🇭🇺",
    SK: "🇸🇰",
    SI: "🇸🇮",
    HR: "🇭🇷",
    BG: "🇧🇬",
    RO: "🇷🇴",
    LT: "🇱🇹",
    LV: "🇱🇻",
    EE: "🇪🇪",
    LU: "🇱🇺",
    MT: "🇲🇹",
    CY: "🇨🇾",
  };
  return flags[country] || "🌍";
};

const getStatusColor = (status?: string): string => {
  switch (status) {
    case "online":
      return "text-green-400";
    case "offline":
      return "text-red-400";
    default:
      return "text-gray-400";
  }
};

const getStatusIcon = (status?: string) => {
  switch (status) {
    case "online":
      return <Wifi className="h-3 w-3" />;
    case "offline":
      return <X className="h-3 w-3" />;
    default:
      return <Server className="h-3 w-3" />;
  }
};

interface AgentSelectorDropdownProps {
  agents: Agent[];
  selectedAgentId: string | null;
  onAgentSelect: (agentId: string) => void;
  onAddAgent?: () => void;
  onEditAgent?: (agent: Agent) => void;
  onDeleteAgent?: (agentId: string) => void;
  className?: string;
}

// Agent列表项子组件
interface AgentListItemProps {
  agent: Agent;
  selected: boolean;
  isDark: boolean;
  onSelect: () => void;
  onEdit: (agent: Agent) => void;
  onDelete: (agentId: string) => void;
  editingAgent: Agent | null;
  editName: string;
  onEditNameChange: (name: string) => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onKeyDown: (e: React.KeyboardEvent) => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const AgentListItem = React.memo(
  ({
    agent,
    selected,
    isDark,
    onSelect,
    onEdit,
    onDelete,
    editingAgent,
    editName,
    onEditNameChange,
    onSaveEdit,
    onCancelEdit,
    onKeyDown,
    inputRef,
  }: AgentListItemProps) => {
    const t = isDark ? themeStyles.dark : themeStyles.light;
    const isEditing = editingAgent?.id === agent.id;
    const [isTouched, setIsTouched] = useState(false);

    const handleTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation();
      setIsTouched(true);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
      e.stopPropagation();
      // 触摸结束时不立即隐藏，让useEffect处理延迟隐藏
    };

    const handleMouseEnter = () => {
      setIsTouched(true);
    };

    const handleMouseLeave = () => {
      setIsTouched(false);
    };

    // 清理定时器
    useEffect(() => {
      let timeoutId: NodeJS.Timeout;
      if (isTouched) {
        timeoutId = setTimeout(() => setIsTouched(false), 2000);
      }
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
      };
    }, [isTouched]);

    return (
      <div
        className={cn(
          "px-3 sm:px-4 py-3 cursor-pointer transition-colors group",
          t.hover,
          selected && t.selected
        )}
        onClick={onSelect}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0">
              <div className={getStatusColor(agent.status)}>
                {getStatusIcon(agent.status)}
              </div>
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div>
                  <Input
                    ref={inputRef}
                    value={editName}
                    onChange={(e) => onEditNameChange(e.target.value)}
                    onKeyDown={onKeyDown}
                    onBlur={onSaveEdit}
                    placeholder="输入Agent名称..."
                    maxLength={50}
                    className={`h-8 text-sm transition-all duration-200 ${
                      isDark
                        ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20"
                        : "bg-white border-gray-300 text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    }`}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    {editName.length}/50
                  </div>
                </div>
              ) : (
                <>
                  <div
                    className="font-medium truncate text-sm sm:text-base"
                    title={agent.name}
                  >
                    {agent.name}
                  </div>
                  <div
                    className="text-xs truncate text-gray-600 dark:text-gray-400"
                    title={`${agent.location?.ip || "未知IP"} ${
                      agent.location?.country || ""
                    }`}
                  >
                    {agent.location?.ip || "未知IP"}
                    {agent.location?.country && (
                      <span className="ml-1">
                        {getCountryFlag(agent.location.country)}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            {selected && (
              <Check className="h-4 w-4 text-blue-500 flex-shrink-0" />
            )}

            {isEditing ? (
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSaveEdit();
                  }}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancelEdit();
                  }}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div
                className={`flex gap-1 transition-opacity flex-shrink-0 ${
                  isTouched
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100"
                }`}
              >
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(agent);
                  }}
                  className="h-6 w-6 p-0 flex-shrink-0"
                >
                  <Edit3 className="h-3 w-3" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(agent.id);
                  }}
                  className="h-6 w-6 p-0 text-red-500 hover:text-red-700 flex-shrink-0"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

AgentListItem.displayName = "AgentListItem";

export function AgentSelectorDropdown({
  agents,
  selectedAgentId,
  onAgentSelect,
  onAddAgent,
  onEditAgent,
  onDeleteAgent,
  className = "",
}: AgentSelectorDropdownProps) {
  const { theme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [editName, setEditName] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 计算下拉菜单位置 - 使用absolute定位
  const calculatePosition = useCallback(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      const width = rect.width;
      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth < 640; // sm断点

      let left = 0; // 相对于父容器的位置

      if (isMobile) {
        // 移动端：左对齐，确保不超出屏幕
        left = 0;
      } else {
        // 桌面端：右对齐
        left = 0;
      }

      const position = {
        top: rect.height + 8, // 按钮高度 + 8px间距
        left: left,
        width: Math.round(width),
      };

      console.log("🔧 Selector位置计算:", {
        rect: {
          top: rect.top,
          bottom: rect.bottom,
          left: rect.left,
          width: rect.width,
          height: rect.height,
        },
        position,
      });

      setDropdownPosition(position);
    }
  }, [isOpen]);

  useEffect(() => {
    calculatePosition();
  }, [calculatePosition]);

  // 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (isOpen) {
        calculatePosition();
      }
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
    };
  }, [isOpen, calculatePosition]);

  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // 性能优化：缓存选中的agent
  const selectedAgent = useMemo(
    () => agents.find((agent) => agent.id === selectedAgentId),
    [agents, selectedAgentId]
  );

  // 主题样式
  const t = useMemo(
    () => (isDark ? themeStyles.dark : themeStyles.light),
    [isDark]
  );

  // 优化的事件处理 - 使用pointerdown统一触控和鼠标事件
  useEffect(() => {
    const handleClickOutside = (event: PointerEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setEditingAgent(null);
      }
    };

    document.addEventListener("pointerdown", handleClickOutside, {
      passive: true,
    });
    return () =>
      document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  // 键盘导航
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => Math.min(prev + 1, agents.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (agents[focusedIndex]) {
            onAgentSelect(agents[focusedIndex].id);
            setIsOpen(false);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          setEditingAgent(null);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, agents, onAgentSelect]);

  // 编辑模式
  useEffect(() => {
    if (editingAgent && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingAgent]);

  // 优化的回调函数
  const handleEdit = useCallback((agent: Agent) => {
    setEditingAgent(agent);
    setEditName(agent.name);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editingAgent && editName.trim() && onEditAgent) {
      const newName = editName.trim();

      // 验证名称长度
      if (newName.length > 50) {
        alert("Agent名称不能超过50个字符");
        return;
      }

      // 验证名称是否与当前名称相同
      if (newName === editingAgent.name) {
        console.log("名称未改变，取消编辑");
        setEditingAgent(null);
        setEditName("");
        return;
      }

      console.log("💾 保存编辑:", {
        agentId: editingAgent.id,
        oldName: editingAgent.name,
        newName,
      });

      // 调用父组件的更新函数
      onEditAgent({ ...editingAgent, name: newName });

      // 关闭编辑模式
      setEditingAgent(null);
      setEditName("");
    }
  }, [editingAgent, editName, onEditAgent]);

  const handleCancelEdit = useCallback(() => {
    setEditingAgent(null);
    setEditName("");
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSaveEdit();
      } else if (e.key === "Escape") {
        handleCancelEdit();
      }
    },
    [handleSaveEdit, handleCancelEdit]
  );

  const handleDelete = useCallback(
    (agentId: string) => {
      if (onDeleteAgent) {
        onDeleteAgent(agentId);
      }
    },
    [onDeleteAgent]
  );

  const handleAgentSelect = useCallback(
    (agentId: string) => {
      onAgentSelect(agentId);
      setIsOpen(false);
    },
    [onAgentSelect]
  );

  return (
    <div className={`relative z-50 ${className}`} ref={dropdownRef}>
      {/* 主按钮 */}
      <Button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "w-full justify-between h-12 px-3 sm:px-4 min-h-[48px]",
          t.bg,
          t.border,
          t.text,
          t.hover,
          "focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        )}
        variant="outline"
      >
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0">
            <Globe className="h-4 w-4 text-sky-400" />
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="font-medium truncate text-sm sm:text-base">
              {selectedAgent?.name || "选择主机"}
            </div>
            <div className="text-xs truncate text-gray-600 dark:text-gray-400">
              {selectedAgent?.location?.ip || "未选择"}
              {selectedAgent?.location?.country && (
                <span className="ml-1">
                  {getCountryFlag(selectedAgent.location.country)}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronDown
          className={`h-4 w-4 flex-shrink-0 text-gray-600 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </Button>

      {/* 下拉菜单 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{
              type: "spring",
              stiffness: 300,
              damping: 30,
            }}
            className={cn(
              "absolute rounded-lg shadow-2xl max-h-80 overflow-y-auto will-change-transform",
              t.dropdown,
              "border backdrop-blur-sm",
              "[&::-webkit-scrollbar]:w-1.5",
              "[&::-webkit-scrollbar-track]:bg-transparent",
              "[&::-webkit-scrollbar-thumb]:bg-gray-300/30",
              "[&::-webkit-scrollbar-thumb]:rounded-full",
              "dark:[&::-webkit-scrollbar-thumb]:bg-gray-600/30"
            )}
            data-testid="agent-selector-dropdown"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
              width: dropdownPosition.width,
              maxWidth: "min(400px, calc(100vw - 1rem))",
              minWidth: "min(280px, calc(100vw - 1rem))",
              zIndex: 99999999,
              scrollbarWidth: "thin",
              scrollbarColor: "rgba(100,100,100,0.3) transparent",
            }}
          >
            {/* 添加新主机按钮 */}
            {onAddAgent && (
              <div className="p-2 border-b border-gray-200 dark:border-neutral-700">
                <Button
                  onClick={onAddAgent}
                  className="w-full justify-start gap-2 h-10"
                  variant="ghost"
                >
                  <Plus className="h-4 w-4" />
                  添加新主机
                </Button>
              </div>
            )}

            {/* 主机列表 */}
            <div className="py-1">
              {agents.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-sm text-center">
                  <Server className="h-6 w-6 opacity-50" />
                  <span className={t.empty}>暂无主机</span>
                  {onAddAgent && (
                    <Button onClick={onAddAgent} variant="outline" size="sm">
                      添加主机
                    </Button>
                  )}
                </div>
              ) : (
                agents.map((agent, index) => (
                  <AgentListItem
                    key={agent.id}
                    agent={agent}
                    selected={selectedAgentId === agent.id}
                    isDark={isDark}
                    onSelect={() => handleAgentSelect(agent.id)}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    editingAgent={editingAgent}
                    editName={editName}
                    onEditNameChange={setEditName}
                    onSaveEdit={handleSaveEdit}
                    onCancelEdit={handleCancelEdit}
                    onKeyDown={handleKeyDown}
                    inputRef={inputRef}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
