"use client";

import { useState, useEffect, useCallback } from "react";
import { getAuth } from "@/services/auth";

interface R2Object {
  key: string;
  size: number;
  uploaded: string;
  httpEtag: string;
  checksums: {
    md5?: string;
    sha1?: string;
    sha256?: string;
    sha384?: string;
    sha512?: string;
  };
}

interface R2BrowserResponse {
  success: boolean;
  data?: {
    objects: R2Object[];
    truncated: boolean;
    cursor?: string;
  };
  error?: string;
}

interface R2BrowserProps {
  adminToken?: string;
}

export default function R2Browser({ adminToken }: R2BrowserProps) {
  const [objects, setObjects] = useState<R2Object[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [deleting, setDeleting] = useState<Set<string>>(new Set());

  const loadObjects = useCallback(
    async (loadCursor?: string | null) => {
      try {
        setLoading(true);
        setError(null);

        const auth = getAuth();
        if (!auth) {
          setError("未登录");
          return;
        }

        const url = new URL(`${process.env.NEXT_PUBLIC_ADMIN_API}/api/browse`);
        if (loadCursor) {
          url.searchParams.set("cursor", loadCursor);
        }
        url.searchParams.set("limit", "50");

        const response = await fetch(url.toString(), {
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            "Content-Type": "application/json",
            ...(adminToken && { "X-Admin-Token": adminToken }),
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: R2BrowserResponse = await response.json();

        if (!data.success) {
          throw new Error(data.error || "加载失败");
        }

        if (loadCursor) {
          setObjects((prev) => [...prev, ...data.data!.objects]);
        } else {
          setObjects(data.data!.objects);
        }

        setCursor(data.data!.cursor || null);
        setHasMore(data.data!.truncated);
      } catch (err) {
        console.error("Load objects error:", err);
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setLoading(false);
      }
    },
    [adminToken]
  );

  const deleteObject = async (key: string) => {
    try {
      setDeleting((prev) => new Set(prev).add(key));

      const auth = getAuth();
      if (!auth) {
        throw new Error("未登录");
      }

      const url = new URL(`${process.env.NEXT_PUBLIC_ADMIN_API}/api/delete`);
      url.searchParams.set("key", key);

      const response = await fetch(url.toString(), {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "Content-Type": "application/json",
          ...(adminToken && { "X-Admin-Token": adminToken }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || "删除失败");
      }

      // 从列表中移除
      setObjects((prev) => prev.filter((obj) => obj.key !== key));
    } catch (err) {
      console.error("Delete object error:", err);
      setError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setDeleting((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  const getImageUrl = (key: string): string => {
    const baseUrl =
      process.env.NEXT_PUBLIC_CDN_BASE || "https://pic.lambdax.me";
    return `${baseUrl}/${key}`;
  };

  useEffect(() => {
    loadObjects();
  }, [loadObjects]);

  if (loading && objects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500/20 to-cyan-500/20 border border-white/10 mb-4">
          <svg
            className="w-6 h-6 text-blue-400 animate-spin"
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
        </div>
        <div className="text-white/60">正在加载文件列表...</div>
      </div>
    );
  }

  if (error && objects.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-red-500/20 to-pink-500/20 border border-red-400/20 mb-4">
          <svg
            className="w-6 h-6 text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        <div className="text-red-400 mb-4 font-medium">加载失败</div>
        <div className="text-white/60 mb-6 text-sm">{error}</div>
        <button
          onClick={() => loadObjects()}
          className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-lg transition-all duration-200 text-sm"
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
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 统计信息和操作栏 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-white">
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
                d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z"
              />
            </svg>
          </div>
          <div>
            <h4 className="text-lg font-semibold text-white">存储浏览器</h4>
            <p className="text-sm text-white/60">管理R2存储桶中的所有文件</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border border-white/10 px-3 py-1 text-sm text-white/80">
            {objects.length} 个文件
          </span>
          <button
            onClick={() => loadObjects()}
            disabled={loading}
            className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors disabled:opacity-50"
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

      {/* 文件列表 */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {objects.map((obj) => (
          <div
            key={obj.key}
            className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-400/30 transition-all duration-200 group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-4">
                {/* 文件图标 */}
                <div className="flex-shrink-0">
                  {obj.key.match(
                    /\.(jpg|jpeg|png|gif|webp|svg|avif|heic)$/i
                  ) ? (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-cyan-500/20 flex items-center justify-center border border-blue-400/20">
                      <svg
                        className="w-5 h-5 text-blue-400"
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
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-500/20 to-slate-500/20 flex items-center justify-center border border-gray-400/20">
                      <svg
                        className="w-5 h-5 text-gray-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                {/* 文件信息 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="text-white font-medium truncate max-w-md"
                      title={obj.key}
                    >
                      {obj.key}
                    </div>
                    {obj.key.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-400/20">
                        图片
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/50">
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
                      {formatSize(obj.size)}
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
                      {formatDate(obj.uploaded)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {obj.key.match(/\.(jpg|jpeg|png|gif|webp)$/i) && (
                <button
                  onClick={() => window.open(getImageUrl(obj.key), "_blank")}
                  className="p-2 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 hover:text-blue-300 transition-colors"
                  title="查看图片"
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
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </button>
              )}
              <button
                onClick={() => deleteObject(obj.key)}
                disabled={deleting.has(obj.key)}
                className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                title={deleting.has(obj.key) ? "删除中..." : "删除文件"}
              >
                {deleting.has(obj.key) ? (
                  <svg
                    className="w-4 h-4 animate-spin"
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
                ) : (
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 加载更多 */}
      {hasMore && (
        <div className="text-center">
          <button
            onClick={() => loadObjects(cursor)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 hover:from-blue-500/30 hover:to-cyan-500/30 border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-lg transition-all duration-200 text-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
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
                加载中...
              </>
            ) : (
              <>
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
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
                加载更多
              </>
            )}
          </button>
        </div>
      )}

      {objects.length === 0 && !loading && (
        <div className="text-center py-8 text-white/60">
          <svg
            className="w-12 h-12 mx-auto mb-4 text-white/40"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
          </svg>
          <p>暂无文件</p>
        </div>
      )}
    </div>
  );
}
