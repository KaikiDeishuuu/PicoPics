"use client";

import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Copy,
  Image,
  Link2,
  Shield,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { QuotaBadge } from "@/components/QuotaBadge";
import { QueryProvider } from "@/components/query-provider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastManager, useToast } from "@/components/Toast";
import { UploadCard } from "@/components/UploadCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/ui/footer";
import { LoadingSpinner } from "@/components/ui/loading";
import { createApiClient } from "@/lib/api";
import { useClipboardUpload } from "@/lib/hooks/use-clipboard-upload";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useQuota } from "@/lib/hooks/use-queries";
import { useUploadQueue } from "@/lib/hooks/use-upload-queue";

// 强制动态渲染，避免静态化
export const dynamic = "force-dynamic";

interface User {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

function UploadPageContent() {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "success" | "error">(
    "idle"
  );
  const [isNavigating, setIsNavigating] = useState(false);
  const [uploadMetrics, setUploadMetrics] = useState<{
    startTime: number | null;
    endTime: number | null;
    fileSize: number | null;
    speed: string;
    duration: string;
  }>({
    startTime: null,
    endTime: null,
    fileSize: null,
    speed: "-",
    duration: "-",
  });
  const router = useRouter();
  const { toast } = useToast();
  useNotifications(); // 初始化通知服务

  const apiClient = useMemo(() => createApiClient(accessToken || undefined), [accessToken]);
  const { data: quotaData } = useQuota(accessToken || undefined);

  const handleUploadFile = async (
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<void> => {
    const startTime = Date.now();
    setUploadMetrics({
      startTime,
      endTime: null,
      fileSize: file.size,
      speed: "-",
      duration: "-",
    });

    try {
      const result = await apiClient.uploadFile(file, (progress) => {
        setUploadProgress(progress);
        onProgress?.(progress);
      });

      if (!result.success) {
        throw new Error(result.error || result.message || "Upload failed");
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      const fileSizeMB = file.size / (1024 * 1024);
      const speedMBps = duration > 0 ? fileSizeMB / (duration / 1000) : 0;

      setUploadMetrics({
        startTime,
        endTime,
        fileSize: file.size,
        speed: `${speedMBps.toFixed(2)} MB/s`,
        duration: `${(duration / 1000).toFixed(2)}s`,
      });
    } catch (error) {
      setUploadMetrics({
        startTime: null,
        endTime: null,
        fileSize: null,
        speed: "-",
        duration: "-",
      });
      throw error;
    }
  };

  const uploadQueue = useUploadQueue({
    concurrency: 2,
    createUploadTask: (file, onProgress) => {
      const task = apiClient.uploadFileTask(file, onProgress);
      return {
        cancel: task.cancel,
        promise: task.promise.then((response) => {
          if (!response.success) {
            throw new Error(response.error || response.message || "Upload failed");
          }
          return response;
        }),
      };
    },
  });

  const queueStats = {
    queued: uploadQueue.items.filter((item) => item.status === "queued").length,
    uploading: uploadQueue.items.filter((item) => item.status === "uploading").length,
    success: uploadQueue.items.filter((item) => item.status === "success").length,
    error: uploadQueue.items.filter((item) => item.status === "error").length,
    cancelled: uploadQueue.items.filter((item) => item.status === "cancelled").length,
  };

  // 上传成功的结果列表：提供 URL / Markdown / HTML / BBCode 一键复制
  const successItems = uploadQueue.items.filter((item) => item.status === "success");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch (_error) {
      toast.error("复制失败", "浏览器拒绝了剪贴板访问");
    }
  };

  useClipboardUpload({
    enabled: !loading && !!accessToken,
    acceptedTypes: ["image/jpeg", "image/png", "image/gif", "image/webp"],
    maxSize: 10 * 1024 * 1024,
    onFiles: async (files) => {
      uploadQueue.enqueueFiles(files);
    },
    onRejected: (reason) => {
      toast.warning("Paste Upload Warning", reason);
    },
  });

  // 认证检查
  useEffect(() => {
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("auth");
    if (!authData) {
      router.push("/");
      return;
    }

    try {
      const auth = JSON.parse(authData);
      if (auth.user && auth.accessToken) {
        setUser(auth.user);
        setAccessToken(auth.accessToken);
        setLoading(false);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to parse auth data:", error);
      localStorage.removeItem("auth");
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    const activeUploads = uploadQueue.items.filter((item) => item.status === "uploading");
    if (activeUploads.length > 0) {
      setUploadStatus("uploading");
      const totalProgress = activeUploads.reduce((sum, item) => sum + item.progress, 0);
      setUploadProgress(Math.round(totalProgress / activeUploads.length));
      return;
    }

    if (queueStats.error > 0) {
      setUploadStatus("error");
      return;
    }

    if (queueStats.success > 0) {
      setUploadStatus("success");
      setUploadProgress(100);
      return;
    }

    setUploadStatus("idle");
    setUploadProgress(0);
  }, [queueStats.error, queueStats.success, uploadQueue.items]);

  // 处理上传成功（不自动跳转：留时间复制外链，画廊入口在上传结果卡片里）
  const successToastCount = useRef(0);
  useEffect(() => {
    if (
      queueStats.success > 0 &&
      queueStats.uploading === 0 &&
      queueStats.queued === 0 &&
      queueStats.success !== successToastCount.current
    ) {
      successToastCount.current = queueStats.success;
      toast.success("上传成功", `成功上传 ${queueStats.success} 张图片`);
    }
  }, [queueStats.queued, queueStats.uploading, queueStats.success, toast]);

  // 处理上传错误
  useEffect(() => {
    if (queueStats.error > 0 && queueStats.uploading === 0) {
      toast.error("部分上传失败", `${queueStats.error} 个文件上传失败，可在队列中重试`);
    }
  }, [queueStats.error, queueStats.uploading, toast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <LoadingSpinner size="lg" />
            </div>
            <h1 className="text-4xl font-bold text-foreground mb-6">Loading upload page...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* 头部导航 */}
        <div className="mb-4 md:mb-8">
          <Card className="card-modern">
            <CardHeader>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-black/80 backdrop-blur-md border border-white/20 text-white hover:bg-white/10 relative z-50"
                    onClick={() => {
                      if (!isNavigating) {
                        setIsNavigating(true);
                        router.push("/");
                      }
                    }}
                    disabled={isNavigating}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Back to Home</span>
                    <span className="sm:hidden">Back</span>
                  </Button>
                  <div>
                    <CardTitle className="text-xl md:text-2xl flex items-center space-x-2 text-foreground">
                      <Upload className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
                      <span>Image Upload</span>
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base text-muted-foreground">
                      欢迎 {user?.login || "User"}！支持 JPG / PNG / GIF / WebP，单文件最大 10MB
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <ThemeToggle />
                  <Button
                    variant="outline"
                    size="sm"
                    className="card-modern relative z-50"
                    onClick={() => {
                      if (!isNavigating) {
                        setIsNavigating(true);
                        router.push(`/gallery?refresh=${Date.now()}`);
                      }
                    }}
                    disabled={isNavigating}
                  >
                    <Image className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">My Gallery</span>
                    <span className="sm:hidden">Gallery</span>
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* 上传状态指示器 */}
        <div>
          {uploadStatus !== "idle" && (
            <div className="mb-8 relative z-10">
              <Card
                className={`card-modern border-0 shadow-lg ${
                  uploadStatus === "success"
                    ? "border-green-200 bg-green-50/50"
                    : uploadStatus === "error"
                      ? "border-red-200 bg-red-50/50"
                      : "border-blue-200 bg-blue-50/50"
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    {uploadStatus === "uploading" && (
                      <div className="flex-shrink-0">
                        <LoadingSpinner size="lg" />
                      </div>
                    )}
                    {uploadStatus === "success" && (
                      <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                    )}
                    {uploadStatus === "error" && (
                      <AlertCircle className="h-8 w-8 text-red-600 flex-shrink-0" />
                    )}
                    <div className="flex-1">
                      <h3 className="text-lg font-medium">
                        {uploadStatus === "uploading" && "正在上传..."}
                        {uploadStatus === "success" && "上传成功！"}
                        {uploadStatus === "error" && "上传失败"}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {uploadStatus === "uploading" && "请稍候，正在处理您的图片"}
                        {uploadStatus === "success" && "图片已成功上传到云端"}
                        {uploadStatus === "error" && "上传过程中出现错误，请重试"}
                      </p>
                      {uploadStatus === "uploading" && (
                        <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* 上传结果：外链与格式片段一键复制 */}
        {successItems.length > 0 && (
          <Card className="card-modern border-0 shadow-lg mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center space-x-2 text-base">
                <Link2 className="h-4 w-4 text-blue-600" />
                <span>上传结果（{successItems.length} 张）</span>
              </CardTitle>
              <CardDescription>点击按钮复制对应格式的外链</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {successItems.map((item) => {
                const result = (
                  item.result as { data?: { url?: string; filename?: string } } | undefined
                )?.data;
                const url = result?.url || "";
                const name = result?.filename || item.file.name;
                if (!url) {
                  return null;
                }
                const snippets = [
                  { key: "url", label: "URL", text: url },
                  { key: "md", label: "Markdown", text: `![${name}](${url})` },
                  { key: "html", label: "HTML", text: `<img src="${url}" alt="${name}" />` },
                  { key: "bb", label: "BBCode", text: `[img]${url}[/img]` },
                ];
                return (
                  <div key={item.id} className="rounded-md border border-border p-3 space-y-2">
                    <p className="text-sm font-medium truncate">{name}</p>
                    <div className="flex flex-wrap gap-2">
                      {snippets.map((snippet) => (
                        <Button
                          key={snippet.key}
                          size="sm"
                          variant="outline"
                          onClick={() => copyText(`${item.id}:${snippet.key}`, snippet.text)}
                        >
                          {copiedKey === `${item.id}:${snippet.key}` ? (
                            <Check className="h-3.5 w-3.5 mr-1 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 mr-1" />
                          )}
                          {snippet.label}
                        </Button>
                      ))}
                      <a href={url} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost">
                          预览
                        </Button>
                      </a>
                    </div>
                  </div>
                );
              })}
              <div className="pt-1">
                <Button
                  size="sm"
                  onClick={() => {
                    if (!isNavigating) {
                      setIsNavigating(true);
                      router.push(`/gallery?refresh=${Date.now()}`);
                    }
                  }}
                  disabled={isNavigating}
                >
                  <Image className="h-4 w-4 mr-1" />
                  前往画廊
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        {/* 主要内容区域 */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* 上传区域 */}
          <div className="lg:col-span-2">
            <div className="mb-4">
              <Card className="card-modern border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    <span>拖拽 / 点击 / 粘贴上传</span>
                  </CardTitle>
                  <CardDescription>单图上传，支持 Ctrl+V / Cmd+V，最大 10MB</CardDescription>
                </CardHeader>
                <CardContent>
                  <UploadCard
                    onUpload={handleUploadFile}
                    onFilesSelected={uploadQueue.enqueueFiles}
                    multiple
                    onRejected={(reason) => toast.error("Upload Failed", reason)}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="mb-4">
              <Card className="card-modern border-0 shadow-lg">
                <CardHeader>
                  <CardTitle>上传队列</CardTitle>
                  <CardDescription>并发 2 个上传任务，支持失败重试与移除</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={uploadQueue.clearCompleted}>
                      清除已完成
                    </Button>
                    <Button size="sm" variant="outline" onClick={uploadQueue.clearNonUploading}>
                      清除非上传项
                    </Button>
                  </div>
                  {uploadQueue.items.length === 0 && (
                    <p className="text-sm text-muted-foreground">当前队列为空。</p>
                  )}
                  {uploadQueue.items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-md border border-border p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(item.file.size / (1024 * 1024)).toFixed(2)} MB · {item.status} ·{" "}
                          {Math.round(item.progress)}%
                        </p>
                        {item.error && <p className="text-xs text-red-500 mt-1">{item.error}</p>}
                      </div>
                      <div className="flex gap-2">
                        {(item.status === "error" || item.status === "cancelled") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => uploadQueue.retryItem(item.id)}
                          >
                            重试
                          </Button>
                        )}
                        {(item.status === "queued" || item.status === "uploading") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => uploadQueue.cancelItem(item.id)}
                          >
                            取消
                          </Button>
                        )}
                        {(item.status === "success" ||
                          item.status === "error" ||
                          item.status === "cancelled") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => uploadQueue.removeItem(item.id)}
                          >
                            移除
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* 侧边栏：本次上传 + 配额，紧凑排布 */}
          <div className="space-y-4">
            {/* 上传效率 */}
            <div>
              <Card className="card-modern border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-card/50 border-b border-border py-3">
                  <CardTitle className="flex items-center space-x-2 text-base text-foreground">
                    <Clock className="h-4 w-4 text-purple-400" />
                    <span>本次上传</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                        <div className="text-xs text-muted-foreground mb-0.5">上传速度</div>
                        <div className="text-base font-semibold text-foreground">
                          {uploadMetrics.speed}
                        </div>
                      </div>
                      <div className="p-2.5 rounded-lg bg-muted/30 border border-border">
                        <div className="text-xs text-muted-foreground mb-0.5">上传时长</div>
                        <div className="text-base font-semibold text-foreground">
                          {uploadMetrics.duration}
                        </div>
                      </div>
                    </div>
                    {uploadMetrics.fileSize != null && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">文件大小</span>
                        <span className="font-medium text-foreground">
                          {(uploadMetrics.fileSize / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 用户配额 */}
            <div>
              <Card className="card-modern border-0 shadow-lg overflow-hidden">
                <CardHeader className="bg-card/50 border-b border-border py-3">
                  <CardTitle className="flex items-center space-x-2 text-base text-foreground">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <span>今日配额</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <QuotaBadge used={quotaData?.used || 0} limit={quotaData?.limit || 100000000} />
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>已使用</span>
                      <span className="font-medium text-foreground">
                        {((quotaData?.used || 0) / (1024 * 1024)).toFixed(2)} MB
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
      </div>
    </div>
  );
}

export default function UploadPage() {
  return (
    <QueryProvider>
      <ToastManager toasts={[]} onClose={() => {}} />
      <UploadPageContent />
    </QueryProvider>
  );
}
