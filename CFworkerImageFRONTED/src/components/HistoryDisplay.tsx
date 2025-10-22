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

interface HistoryDisplayProps {
  onImageClick?: (record: ImageHistoryRecord) => void;
}

export default function HistoryDisplay({ onImageClick }: HistoryDisplayProps) {
  const [records, setRecords] = useState<ImageHistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadHistory();
  }, []);

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

      setRecords(result.data || []);
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
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
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
            {records.length} 张图片
          </span>
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
        {records.map((record, index) => (
          <div
            key={record.id}
            className="group glass-modern-soft border border-white/10 rounded-xl overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-blue-500/20 hover:border-blue-400/30"
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={() => onImageClick?.(record)}
          >
            <div className="relative bg-gradient-to-br from-gray-900/50 to-black/50 overflow-hidden aspect-square flex items-center justify-center">
              <Image
                src={getImageUrl(record.r2ObjectKey)}
                alt={record.filename}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                onError={(e) => {
                  // 如果图片加载失败，显示占位符
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    parent.innerHTML = `
                      <div class="flex items-center justify-center h-full text-white/40">
                        <svg class="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clip-rule="evenodd" />
                        </svg>
                      </div>
                    `;
                  }
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* 悬停时的操作按钮 */}
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
            </div>

            <div className="p-4">
              <div
                className="text-sm text-white/80 mb-2 truncate font-medium"
                title={record.filename}
              >
                {record.filename}
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
