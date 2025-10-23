/**
 * 历史记录展示组件
 * 显示用户的图片历史记录
 */

"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { ImageHistoryRecord } from "@/types";
import { getUserHistory, getImageUrl } from "@/services/history";
import { getAuth } from "@/services/auth";
import { deleteInvalidRecords } from "@/services/admin";
import { useHistoryRefresh, useFileDeleted } from "@/hooks/useGlobalState";

interface HistoryDisplayProps {
  onImageClick?: (record: ImageHistoryRecord) => void;
}

export default function HistoryDisplay({ onImageClick }: HistoryDisplayProps) {
  const [records, setRecords] = useState<ImageHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [imageStatuses, setImageStatuses] = useState<Record<string, boolean>>(
    {}
  );

  // 全局状态管理
  const { refreshTrigger } = useHistoryRefresh();
  const { fileDeleted, clearFileDeleted } = useFileDeleted();

  useEffect(() => {
    loadHistory();
  }, []);

  // 监听刷新触发器
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadHistory();
    }
  }, [refreshTrigger]);

  // 监听文件删除事件
  useEffect(() => {
    if (fileDeleted) {
      // 从本地状态中移除被删除的文件
      setRecords((prev) =>
        prev.filter((record) => !fileDeleted.keys.includes(record.r2ObjectKey))
      );

      // 从状态中移除这些记录的状态
      setImageStatuses((prev) => {
        const newStatuses = { ...prev };
        fileDeleted.keys.forEach((key) => {
          delete newStatuses[key];
        });
        return newStatuses;
      });

      // 清除文件删除事件
      clearFileDeleted();
    }
  }, [fileDeleted, clearFileDeleted]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError("");

      const auth = getAuth();
      if (!auth) {
        setError("请先登录");
        return;
      }

      const result = await getUserHistory(auth.accessToken);

      if (!result.success) {
        setError(result.error || "加载历史记录失败");
        return;
      }

      const historyRecords = result.data || [];
      setRecords(historyRecords);

      // 初始化所有图片状态为 true（假设存在）
      const initialStatuses: Record<string, boolean> = {};
      historyRecords.forEach((record) => {
        initialStatuses[record.r2ObjectKey] = true;
      });
      setImageStatuses(initialStatuses);

      // 异步检查每张图片是否存在（不阻塞UI）
      const invalidRecords: string[] = [];

      historyRecords.forEach(async (record) => {
        try {
          const response = await fetch(getImageUrl(record.r2ObjectKey), {
            method: "HEAD",
            // 设置较短的超时，避免长时间等待
            signal: AbortSignal.timeout(5000),
          });

          // 如果状态不是2xx，标记为不存在
          if (!response.ok) {
            setImageStatuses((prev) => ({
              ...prev,
              [record.r2ObjectKey]: false,
            }));

            // 收集无效记录，准备自动删除
            invalidRecords.push(record.r2ObjectKey);
          }
        } catch {
          // 如果请求失败（超时、网络错误等），暂时保持为 true
          // 让用户能看到图片，如果真的不存在，Image 组件的 onError 会处理
        }
      });

      // 如果有无效记录，自动删除它们
      if (invalidRecords.length > 0) {
        setTimeout(async () => {
          try {
            await deleteInvalidRecords(invalidRecords);
            console.log(`自动清理了 ${invalidRecords.length} 个无效记录`);

            // 从本地状态中移除这些记录
            setRecords((prev) =>
              prev.filter(
                (record) => !invalidRecords.includes(record.r2ObjectKey)
              )
            );

            // 从状态中移除这些记录的状态
            setImageStatuses((prev) => {
              const newStatuses = { ...prev };
              invalidRecords.forEach((key) => {
                delete newStatuses[key];
              });
              return newStatuses;
            });
          } catch (error) {
            console.error("自动清理无效记录失败:", error);
          }
        }, 2000); // 延迟2秒执行，确保所有检查完成
      }
    } catch (err) {
      console.error("Load history error:", err);
      setError("加载历史记录失败");
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (diffDays === 1) {
      return "昨天";
    } else if (diffDays < 7) {
      return `${diffDays}天前`;
    } else {
      return date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const cleanInvalidRecords = async () => {
    try {
      const auth = getAuth();
      if (!auth) return;

      // 找出所有不存在的图片记录
      const invalidRecords = records.filter(
        (record) => imageStatuses[record.r2ObjectKey] === false
      );

      if (invalidRecords.length === 0) {
        alert("没有发现无效记录");
        return;
      }

      if (
        !confirm(
          `确定要删除 ${invalidRecords.length} 个无效的图片记录吗？这些记录对应的图片文件已不存在。`
        )
      ) {
        return;
      }

      // 调用后端API删除无效记录
      const r2ObjectKeys = invalidRecords.map((record) => record.r2ObjectKey);
      await deleteInvalidRecords(r2ObjectKeys);

      // 从前端状态中移除这些记录
      setRecords((prev) =>
        prev.filter((record) => imageStatuses[record.r2ObjectKey] !== false)
      );

      alert(`已清理 ${invalidRecords.length} 个无效记录`);
    } catch (error) {
      console.error("Clean invalid records error:", error);
      alert("清理失败，请稍后重试");
    }
  };

  if (loading) {
    return (
      <div className="glass-modern border-gradient relative rounded-2xl p-6 md:p-8">
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center space-x-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent"></div>
            <span className="text-white/70">加载历史记录中...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-modern border-gradient relative rounded-2xl p-6 md:p-8">
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            <svg
              className="w-12 h-12 mx-auto mb-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">加载失败</h3>
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={loadHistory}
            className="px-6 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors"
          >
            重试
          </button>
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="glass-modern border-gradient relative rounded-2xl p-6 md:p-8">
        <div className="text-center py-12">
          <div className="text-white/40 mb-4">
            <svg
              className="w-16 h-16 mx-auto mb-4"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">
            暂无历史记录
          </h3>
          <p className="text-white/60">
            上传第一张图片后，历史记录将显示在这里
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-modern border-gradient relative rounded-2xl p-6 md:p-8">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 text-white">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white">历史记录</h3>
        </div>
        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-white/10 px-3 py-1 text-sm text-white/80">
            {
              records.filter(
                (record) => imageStatuses[record.r2ObjectKey] !== false
              ).length
            }{" "}
            张图片
            {Object.values(imageStatuses).filter((status) => status === false)
              .length > 0 && (
              <span className="ml-1 text-red-400">
                (
                {
                  Object.values(imageStatuses).filter(
                    (status) => status === false
                  ).length
                }{" "}
                张不可用)
              </span>
            )}
          </span>
          {Object.values(imageStatuses).some((status) => status === false) && (
            <button
              onClick={cleanInvalidRecords}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 hover:border-red-400/50 text-red-300 hover:text-red-200 rounded-lg transition-colors text-sm"
              title="清理无效记录"
            >
              清理无效
            </button>
          )}
          <button
            onClick={loadHistory}
            className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            title="刷新"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        {records
          .filter((record) => imageStatuses[record.r2ObjectKey] !== false) // 只过滤掉明确不存在的图片
          .map((record, index) => (
            <div
              key={record.id}
              className={`group glass-modern-soft border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20 hover:border-blue-400/30 ${
                imageStatuses[record.r2ObjectKey] === false
                  ? "opacity-50 grayscale"
                  : ""
              }`}
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() =>
                imageStatuses[record.r2ObjectKey] !== false &&
                onImageClick?.(record)
              }
            >
              <div className="relative bg-gradient-to-br from-gray-900/50 to-black/50 overflow-hidden aspect-square flex items-center justify-center">
                {imageStatuses[record.r2ObjectKey] === false ? (
                  // 图片不存在时显示占位符
                  <div className="flex flex-col items-center justify-center text-white/40">
                    <svg
                      className="w-12 h-12 mb-2"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-xs text-center px-2">图片不可用</span>
                  </div>
                ) : (
                  <Image
                    src={getImageUrl(record.r2ObjectKey)}
                    alt={record.filename}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    onError={async (e) => {
                      // 如果图片加载失败，更新状态
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      setImageStatuses((prev) => ({
                        ...prev,
                        [record.r2ObjectKey]: false,
                      }));

                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                        <div class="flex flex-col items-center justify-center h-full text-white/40">
                          <svg class="w-8 h-8 mb-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                          </svg>
                          <span class="text-xs">图片不可用</span>
                        </div>
                      `;
                      }

                      // 自动删除这个无效记录
                      try {
                        await deleteInvalidRecords([record.r2ObjectKey]);
                        console.log(
                          `自动清理了无效记录: ${record.r2ObjectKey}`
                        );

                        // 从本地状态中移除这个记录
                        setRecords((prev) =>
                          prev.filter(
                            (r) => r.r2ObjectKey !== record.r2ObjectKey
                          )
                        );

                        // 从状态中移除这个记录的状态
                        setImageStatuses((prev) => {
                          const newStatuses = { ...prev };
                          delete newStatuses[record.r2ObjectKey];
                          return newStatuses;
                        });
                      } catch (error) {
                        console.error("自动清理无效记录失败:", error);
                      }
                    }}
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* 悬停时的操作按钮 */}
                {imageStatuses[record.r2ObjectKey] !== false && (
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(getImageUrl(record.r2ObjectKey), "_blank");
                      }}
                      className="p-2 rounded-lg bg-black/50 hover:bg-black/70 text-white/80 hover:text-white transition-colors"
                      title="在新标签页中打开"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-4">
                <div
                  className="text-sm text-white/80 mb-2 truncate font-medium"
                  title={record.filename}
                >
                  {record.filename}
                  {imageStatuses[record.r2ObjectKey] === false && (
                    <span className="ml-2 text-xs text-red-400">(不可用)</span>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-white/50">
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {formatFileSize(record.fileSize)}
                  </span>
                  <span className="flex items-center gap-1">
                    <svg
                      className="w-3 h-3"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {formatDate(record.uploadDate)}
                  </span>
                </div>
              </div>
            </div>
          ))}
      </div>

      {records.length > 0 && (
        <div className="mt-6 text-center">
          <button
            onClick={loadHistory}
            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-lg transition-all duration-200 text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            刷新历史记录
          </button>
        </div>
      )}
    </div>
  );
}
