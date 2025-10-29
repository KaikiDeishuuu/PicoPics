"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import {
  Activity,
  Cpu,
  Network,
  Wifi,
  ArrowDownUp,
  RefreshCw,
  MemoryStick,
  HardDrive,
  Clock,
  MapPin,
  Flag,
  Eye,
  EyeOff,
  Settings,
  Download,
  FileText,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { useEffect, useState, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useAgentManager } from "@/hooks/useAgentManager";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { AgentSelectorDropdown } from "@/components/ui/agent-selector-dropdown";
import { ChartContainer } from "@/components/ui/chart-container";
import {
  AgentClient,
  AgentStateInfo,
  AgentHostInfo,
  AgentHealthResponse,
  createAgentClient,
} from "@/lib/agent-client";

// 性能指标类型
interface PerformanceMetrics {
  time: string;
  cpu: number;
  memory: number;
  networkUp: number;
  networkDown: number;
  tcpConnections: number;
  udpConnections: number;
  processCount: number; // 替换diskRead为process_count
  diskUsed: number; // 替换diskWrite为disk_used
  swapUsed: number; // 替换uptime为swap_used
  uptime: number; // 系统运行时间（秒）
}

// 监控卡片组件
interface MonitorCardProps {
  title: string;
  icon: React.ReactNode;
  color: string;
  dataKey: string;
  data: PerformanceMetrics[];
  unit?: string;
  showAdvanced?: boolean;
  onToggleAdvanced?: () => void;
  cardClass?: string;
  textClass?: string;
  isDark?: boolean;
}

function MonitorCard({
  title,
  icon,
  color,
  dataKey,
  data,
  unit = "",
  showAdvanced = false,
  onToggleAdvanced,
  cardClass = "bg-gray-800/50 backdrop-blur-sm border-gray-700",
  textClass = "text-gray-100",
  isDark = true,
}: MonitorCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <Card
        className={`${cardClass} shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]`}
      >
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="flex items-center gap-2">
            <div className="text-sky-400">{icon}</div>
            <CardTitle
              className={`text-base font-medium ${textClass} flex items-center gap-2`}
            >
              {title}
              {unit && (
                <span
                  className={`text-xs ${
                    isDark
                      ? "text-gray-400 bg-gray-700"
                      : "text-gray-600 bg-gray-200"
                  } px-2 py-1 rounded`}
                >
                  {unit}
                </span>
              )}
            </CardTitle>
          </div>
          {onToggleAdvanced && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleAdvanced}
              className={`h-8 w-8 p-0 ${
                isDark
                  ? "text-gray-400 hover:text-gray-200"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              {showAdvanced ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <ChartContainer className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient
                    id={`gradient-${dataKey}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" hide axisLine={false} tickLine={false} />
                <YAxis hide axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(0, 0, 0, 0.8)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  formatter={(value: any) => [`${value}${unit}`, title]}
                />
                <Area
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  fill={`url(#gradient-${dataKey})`}
                  dot={false}
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-400">
            <span>实时监控</span>
            <Badge variant="secondary" className="text-xs">
              {data.length} 个数据点
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// 统计卡片组件
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: "up" | "down" | "stable";
  color?: string;
  cardClass?: string;
  textClass?: string;
  isDark?: boolean;
}

function StatCard({
  title,
  value,
  icon,
  trend,
  color = "#38bdf8",
  cardClass = "bg-gray-800/50 backdrop-blur-sm border-gray-700",
  textClass = "text-gray-100",
  isDark = true,
}: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${cardClass} shadow-md`}>
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center justify-between min-h-[60px]">
            <div className="flex-1 min-w-0">
              <p
                className={`text-xs sm:text-sm ${
                  isDark ? "text-gray-400" : "text-gray-600"
                } truncate`}
              >
                {title}
              </p>
              <p
                className={`text-lg sm:text-2xl font-bold ${textClass} truncate`}
              >
                {value}
              </p>
            </div>
            <div className="text-sky-400 flex-shrink-0 ml-2">{icon}</div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function SystemMonitorModern() {
  const { theme } = useTheme();

  // 检测是否为暗色主题
  const isDark =
    theme === "dark" ||
    (theme === "system" &&
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);

  // 使用useMemo优化动态样式类计算 - 支持移动端适配
  const containerClass = useMemo(() => {
    return isDark
      ? "p-4 sm:p-6 min-h-screen bg-gradient-to-br from-zinc-900 via-gray-900 to-slate-800 text-gray-100 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 relative overflow-visible"
      : "p-4 sm:p-6 min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 text-gray-900 rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-500 border border-gray-200 relative overflow-visible";
  }, [isDark]);

  const cardClass = useMemo(() => {
    return isDark
      ? "bg-gray-800/50 backdrop-blur-sm border-gray-700"
      : "bg-white/80 backdrop-blur-sm border-gray-200";
  }, [isDark]);

  const textClass = useMemo(() => {
    return isDark ? "text-gray-100" : "text-gray-900";
  }, [isDark]);

  const {
    agents: localAgents,
    selectedAgentId,
    selectedAgent,
    setSelectedAgentId,
    updateAgentName,
    checkAllAgentsStatus,
  } = useAgentManager();
  const [agents, setAgents] = useState<any[]>([]);
  const [performanceData, setPerformanceData] = useState<PerformanceMetrics[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvancedStats, setShowAdvancedStats] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(5000);

  // 从API获取真实的agents数据
  useEffect(() => {
    const fetchAgents = async () => {
      try {
        // 直接连接到agent服务器获取agents列表，避免代理的CORS问题
        const agentClient = new AgentClient(
          process.env.NEXT_PUBLIC_AGENT_API_URL || "https://your-agent-api.com",
          process.env.NEXT_PUBLIC_AGENT_API_KEY || "your_agent_api_key_here"
        );
        const data = await agentClient.getAgents(50, 0);
        console.log("API返回的agents数据:", data);
        // 使用UUID去重，优先保留最新的agent
        const uniqueAgents = new Map();
        data.forEach((agent: any) => {
          const key = agent.uuid; // 只使用UUID
          if (!key) {
            console.warn("Agent missing UUID:", agent);
            return; // 跳过没有UUID的agent
          }
          const agentData = {
            id: key, // 使用UUID作为id
            name: agent.name || `Agent-${agent.real_ip || agent.remote_addr}`,
            url:
              process.env.NEXT_PUBLIC_AGENT_API_URL ||
              "https://ag1nt.lambdax.me", // 直接使用agent服务器URL
            status: agent.status || "unknown",
            lastSeen: new Date(agent.last_seen || Date.now()),
            location: {
              ip: agent.real_ip || agent.remote_addr,
              country: agent.country || "",
            },
            uuid: agent.uuid || "",
            originalId: agent.id, // 保存原始ID用于排序
            apiKey:
              process.env.NEXT_PUBLIC_AGENT_API_KEY ||
              "your_agent_api_key_here", // 使用统一的API key
          };

          if (!uniqueAgents.has(key)) {
            uniqueAgents.set(key, agentData);
          } else {
            // 如果已存在，比较时间戳，保留最新的
            const existing = uniqueAgents.get(key);
            const existingTime = new Date(existing.lastSeen).getTime();
            const currentTime = new Date(agentData.lastSeen).getTime();

            if (currentTime > existingTime) {
              uniqueAgents.set(key, agentData);
            }
          }
        });
        const result = Array.from(uniqueAgents.values());
        console.log("处理后的agents数据:", result);
        setAgents(result);
      } catch (error) {
        console.error("Failed to fetch agents:", error);
        // 如果API失败，使用本地agents
        setAgents(localAgents);
      }
    };

    fetchAgents();
  }, [localAgents]);

  // 格式化运行时间（秒转换为天小时）
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      return `${days}天${hours}小时`;
    } else if (hours > 0) {
      return `${hours}小时${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  // 获取真实数据
  const fetchRealData = useCallback(async () => {
    if (!selectedAgentId) return [];

    // 获取当前选中的agent
    const currentAgent = localAgents.find(
      (agent) => agent.id === selectedAgentId
    );
    if (!currentAgent) return [];

    try {
      // 使用AgentClient获取数据
      const agentClient = new AgentClient(
        currentAgent.url,
        currentAgent.apiKey
      );
      const [statesData, hostsData] = await Promise.all([
        agentClient.getStates(50, 0),
        agentClient.getHosts(50, 0),
      ]);

      console.log("API返回的状态数据:", statesData);
      console.log("API返回的主机数据:", hostsData);

      // 根据selectedAgentId过滤状态数据 - 使用originalId匹配API数据
      const filteredStates = statesData.filter((item: any) => {
        return item.agent_id.toString() === currentAgent.originalId?.toString();
      });

      // 获取当前agent的总内存信息
      const currentHost = hostsData.find((host: any) => {
        return host.agent_id.toString() === currentAgent.originalId?.toString();
      });

      const totalMemory = currentHost?.mem_total || 976039936; // 使用API返回的总内存，默认976MB

      console.log(
        `过滤后的数据 (UUID: ${selectedAgentId}, originalId: ${currentAgent.originalId}):`,
        filteredStates
      );
      console.log(
        `总内存: ${totalMemory} bytes (${(
          totalMemory /
          (1024 * 1024 * 1024)
        ).toFixed(2)}GB)`
      );

      return filteredStates.map((item: any, index: number) => ({
        time: new Date(
          item.created_at || Date.now() - (19 - index) * 5000
        ).toLocaleTimeString("zh-CN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        cpu: item.cpu || 0,
        memory: (item.mem_used / totalMemory) * 100 || 0, // 使用API返回的总内存计算百分比
        networkUp: (item.net_out_speed || 0) / 1024, // 转换为KB/s
        networkDown: (item.net_in_speed || 0) / 1024, // 转换为KB/s
        tcpConnections: item.tcp_conn_count || 0,
        udpConnections: item.udp_conn_count || 0,
        processCount: item.process_count || 0, // 进程数量
        diskUsed: (item.disk_used || 0) / (1024 * 1024 * 1024), // 转换为GB
        swapUsed: (item.swap_used || 0) / (1024 * 1024), // 转换为MB
        uptime: item.uptime || 0, // 系统运行时间（秒）
      }));
    } catch (error) {
      console.error("Failed to fetch real data:", error);
      return []; // 返回空数组而不是模拟数据
    }
  }, [selectedAgentId, localAgents]);

  // 获取国家旗帜emoji
  const getCountryFlag = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return "🌍";
    const code = countryCode.toUpperCase();
    return String.fromCodePoint(
      ...Array.from(code).map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
    );
  };

  // 初始化数据
  useEffect(() => {
    const loadData = async () => {
      const data = await fetchRealData();
      setPerformanceData(data);
    };
    loadData();
  }, [fetchRealData]);

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(async () => {
      const data = await fetchRealData();
      setPerformanceData(data);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchRealData]);

  // 手动刷新
  const handleRefresh = useCallback(async () => {
    setIsLoading(true);
    try {
      await checkAllAgentsStatus();
      const data = await fetchRealData();
      setPerformanceData(data);
    } catch (error) {
      console.error("刷新失败:", error);
    } finally {
      setIsLoading(false);
    }
  }, [checkAllAgentsStatus, fetchRealData]);

  // 获取当前选中的主机信息
  const currentHost = useMemo(() => {
    return localAgents.find((agent) => agent.id === selectedAgentId);
  }, [localAgents, selectedAgentId]);

  // 性能指标配置
  const performanceMetrics = [
    {
      title: "CPU 使用率",
      icon: <Cpu size={20} />,
      color: "#38bdf8",
      dataKey: "cpu",
      unit: "%",
    },
    {
      title: "内存占用",
      icon: <MemoryStick size={20} />,
      color: "#a78bfa",
      dataKey: "memory",
      unit: "%",
    },
    {
      title: "网络上行",
      icon: <ArrowDownUp size={20} />,
      color: "#4ade80",
      dataKey: "networkUp",
      unit: " Mbps",
    },
    {
      title: "网络下行",
      icon: <ArrowDownUp size={20} />,
      color: "#22c55e",
      dataKey: "networkDown",
      unit: " Mbps",
    },
    {
      title: "TCP 连接",
      icon: <Network size={20} />,
      color: "#f97316",
      dataKey: "tcpConnections",
      unit: "",
    },
    {
      title: "UDP 连接",
      icon: <Wifi size={20} />,
      color: "#f59e0b",
      dataKey: "udpConnections",
      unit: "",
    },
  ];

  // 高级指标配置
  const advancedMetrics = [
    {
      title: "进程数量",
      icon: <HardDrive size={20} />,
      color: "#8b5cf6",
      dataKey: "processCount",
      unit: "个",
    },
    {
      title: "磁盘使用量",
      icon: <HardDrive size={20} />,
      color: "#ec4899",
      dataKey: "diskUsed",
      unit: "GB",
    },
    {
      title: "交换分区使用量",
      icon: <HardDrive size={20} />,
      color: "#ef4444",
      dataKey: "swapUsed",
      unit: "MB",
    },
  ];

  return (
    <div className="relative">
      <motion.div
        className={containerClass}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* 顶部控制栏 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card className={`${cardClass} shadow-lg mb-6 relative z-[100]`}>
            <CardHeader className="flex flex-col gap-4">
              {/* 标题和下拉菜单行 - 桌面端并排，移动端堆叠 */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                {/* 标题和IP信息 */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="text-sky-400 flex-shrink-0">
                    <Activity size={24} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className={`text-xl font-semibold ${textClass}`}>
                      系统监督中心
                    </CardTitle>
                    {currentHost && (
                      <div
                        className={`text-sm ${
                          isDark ? "text-gray-400" : "text-gray-600"
                        } mt-1 flex items-center gap-2`}
                      >
                        <span className="truncate">
                          {currentHost.name ||
                            `Agent-${
                              currentHost.location?.ip || currentHost.id
                            }`}
                        </span>
                        {currentHost.location?.ip && (
                          <span className="text-sky-400 text-xs sm:text-sm truncate">
                            • {currentHost.location.ip}
                          </span>
                        )}
                        {currentHost.location?.country && (
                          <span className="flex-shrink-0">
                            {getCountryFlag(currentHost.location.country)}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 下拉菜单 - 桌面端在右侧，移动端左对齐防止超出 */}
                <div className="flex justify-start sm:justify-end">
                  <AgentSelectorDropdown
                    agents={localAgents}
                    selectedAgentId={selectedAgentId}
                    onAgentSelect={setSelectedAgentId}
                    onEditAgent={(agent) => {
                      console.log("Edit agent:", agent);
                      updateAgentName(agent.id, agent.name);
                    }}
                    onDeleteAgent={(agentId) => {
                      console.log("Delete agent:", agentId);
                    }}
                    className="w-full max-w-[calc(100vw-2rem)] sm:w-48 sm:max-w-none md:w-64 lg:w-80"
                  />
                </div>
              </div>

              {/* 刷新控制按钮行 - 移动端居中，桌面端右对齐 */}
              <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-4">
                {/* 刷新控制 - 移动端隐藏文字 */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Switch
                    checked={autoRefresh}
                    onCheckedChange={setAutoRefresh}
                    className="data-[state=checked]:bg-sky-500"
                  />
                  <span className="text-sm text-gray-400 whitespace-nowrap hidden sm:inline">
                    自动刷新
                  </span>
                </div>

                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className={`rounded-2xl ${cardClass} hover:opacity-80 border flex-shrink-0 ${
                    isDark
                      ? "border-gray-700 text-gray-100"
                      : "border-gray-300 text-gray-900"
                  }`}
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  <span className="hidden sm:inline ml-2">刷新</span>
                </Button>
              </div>
            </CardHeader>
          </Card>
        </motion.div>

        {/* 统计概览 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6"
        >
          <StatCard
            title="在线主机"
            value={localAgents.length}
            icon={<CheckCircle size={20} />}
            color="#4ade80"
            cardClass={cardClass}
            textClass={textClass}
            isDark={isDark}
          />
          <StatCard
            title="平均 CPU"
            value={`${(
              performanceData.reduce((sum, d) => sum + d.cpu, 0) /
              performanceData.length
            ).toFixed(1)}%`}
            icon={<Cpu size={20} />}
            color="#38bdf8"
            cardClass={cardClass}
            textClass={textClass}
            isDark={isDark}
          />
          <StatCard
            title="平均内存"
            value={`${(
              performanceData.reduce((sum, d) => sum + d.memory, 0) /
              performanceData.length
            ).toFixed(1)}%`}
            icon={<MemoryStick size={20} />}
            color="#a78bfa"
            cardClass={cardClass}
            textClass={textClass}
            isDark={isDark}
          />
          <StatCard
            title="网络负载"
            value={(() => {
              const avgNetwork =
                performanceData.reduce(
                  (sum, d) => sum + d.networkUp + d.networkDown,
                  0
                ) / performanceData.length;
              if (avgNetwork >= 1024) {
                return `${(avgNetwork / 1024).toFixed(1)}MB/s`;
              }
              return `${avgNetwork.toFixed(1)}KB/s`;
            })()}
            icon={<Network size={20} />}
            color="#4ade80"
            cardClass={cardClass}
            textClass={textClass}
          />
        </motion.div>

        {/* 系统运行时间容器 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-6"
        >
          <Card className={`${cardClass} shadow-lg`}>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-full bg-blue-500/10 flex-shrink-0">
                    <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" />
                  </div>
                  <div className="min-w-0">
                    <h3
                      className={`text-base sm:text-lg font-semibold ${textClass}`}
                    >
                      系统运行时间
                    </h3>
                    <p
                      className={`text-xs sm:text-sm ${
                        isDark ? "text-gray-400" : "text-gray-600"
                      }`}
                    >
                      当前主机运行时长
                    </p>
                  </div>
                </div>
                <div className="text-left sm:text-right w-full sm:w-auto">
                  <p
                    className={`text-lg sm:text-xl md:text-2xl font-bold ${textClass} break-words leading-tight`}
                  >
                    {performanceData.length > 0
                      ? formatUptime(
                          performanceData[performanceData.length - 1].uptime
                        )
                      : "--"}
                  </p>
                  <p
                    className={`text-xs ${
                      isDark ? "text-gray-400" : "text-gray-600"
                    } mt-1`}
                  >
                    天/小时/分钟
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 性能监控图表 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6"
        >
          {performanceMetrics.map((metric, index) => (
            <motion.div
              key={metric.dataKey}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 + index * 0.1 }}
            >
              <MonitorCard
                title={metric.title}
                icon={metric.icon}
                color={metric.color}
                dataKey={metric.dataKey}
                data={performanceData}
                unit={metric.unit}
                cardClass={cardClass}
                textClass={textClass}
                isDark={isDark}
              />
            </motion.div>
          ))}
        </motion.div>

        {/* 高级统计切换 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mb-6"
        >
          <Card className={`${cardClass} shadow-md`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings size={20} className="text-gray-400" />
                  <span
                    className={`${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    高级监控指标
                  </span>
                </div>
                <Switch
                  checked={showAdvancedStats}
                  onCheckedChange={setShowAdvancedStats}
                  className="data-[state=checked]:bg-sky-500"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 高级统计图表 */}
        <AnimatePresence>
          {showAdvancedStats && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6"
            >
              {advancedMetrics.map((metric, index) => (
                <motion.div
                  key={metric.dataKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <MonitorCard
                    title={metric.title}
                    icon={metric.icon}
                    color={metric.color}
                    dataKey={metric.dataKey}
                    data={performanceData}
                    unit={metric.unit}
                    cardClass={cardClass}
                    textClass={textClass}
                    isDark={isDark}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 底部操作栏 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex justify-end gap-3"
        >
          <Button
            variant="outline"
            size="sm"
            className={`rounded-2xl ${cardClass} hover:opacity-80 border ${
              isDark
                ? "border-gray-700 text-gray-100"
                : "border-gray-300 text-gray-900"
            }`}
          >
            <Download size={16} className="mr-2" />
            导出数据
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`rounded-2xl ${cardClass} hover:opacity-80 border ${
              isDark
                ? "border-gray-700 text-gray-100"
                : "border-gray-300 text-gray-900"
            }`}
          >
            <FileText size={16} className="mr-2" />
            查看日志
          </Button>
        </motion.div>
      </motion.div>
    </div>
  );
}
