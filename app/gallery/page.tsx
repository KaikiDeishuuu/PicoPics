"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useUserImages, useDeleteImage } from "@/lib/hooks/use-queries";

// 强制动态渲染，避免静态化
export const dynamic = "force-dynamic";

interface ImageRecord {
  id: string;
  fileName: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  r2ObjectKey: string;
}

interface CopyFormat {
  name: string;
  format: (url: string, fileName: string) => string;
}

function GalleryContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    login: string;
    [key: string]: unknown;
  } | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<ImageRecord | null>(null);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [cleaning, setCleaning] = useState(false);

  // React Query hooks
  const {
    data: imagesResponse,
    isLoading,
    error,
  } = useUserImages(accessToken || undefined);
  const images = Array.isArray(imagesResponse?.data) ? imagesResponse.data : [];

  // 调试信息
  console.log("Gallery images data:", {
    imagesResponse,
    images,
    isLoading,
    error,
  });
  const deleteMutation = useDeleteImage(accessToken || undefined);

  // 定义多种引用格式
  const copyFormats: CopyFormat[] = [
    {
      name: "直接链接",
      format: (url: string) => url,
    },
    {
      name: "Markdown 图片",
      format: (url: string, fileName: string) => `![${fileName}](${url})`,
    },
    {
      name: "HTML 图片",
      format: (url: string, fileName: string) =>
        `<img src="${url}" alt="${fileName}" />`,
    },
    {
      name: "BBCode 图片",
      format: (url: string) => `[img]${url}[/img]`,
    },
    {
      name: "Markdown 链接",
      format: (url: string, fileName: string) => `[${fileName}](${url})`,
    },
    {
      name: "HTML 链接",
      format: (url: string, fileName: string) =>
        `<a href="${url}">${fileName}</a>`,
    },
  ];

  useEffect(() => {
    // 检查认证状态
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("auth");
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        if (auth.user && auth.accessToken) {
          setIsAuthenticated(true);
          setUser(auth.user);
          setAccessToken(auth.accessToken);
        }
      } catch (error) {
        console.error("Failed to parse auth data:", error);
      }
    }
  }, []);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / k ** i).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  // 删除图片
  const handleDeleteImage = async (imageId: string, r2ObjectKey: string) => {
    if (!confirm("确定要删除这张图片吗？此操作不可撤销。")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(r2ObjectKey);
    } catch (err) {
      console.error("Delete image error:", err);
      alert(err instanceof Error ? err.message : "删除失败");
    }
  };

  // 复制到剪贴板
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // 可以添加一个 toast 通知
      alert("已复制到剪贴板！");
    } catch (err) {
      console.error("Copy failed:", err);
      alert("复制失败，请手动复制");
    }
  };

  // 打开复制模态框
  const openCopyModal = (image: ImageRecord) => {
    setSelectedImage(image);
    setShowCopyModal(true);
  };

  // 清空存储
  const clearStorage = async () => {
    if (
      !confirm(
        "⚠️ 警告：这将删除您的所有图片和记录！\n\n此操作不可撤销，确定要继续吗？"
      )
    ) {
      return;
    }

    // 二次确认
    if (
      !confirm(
        "最后确认：您确定要清空所有存储吗？\n\n这将删除：\n- 所有 R2 存储的图片文件\n- 所有数据库记录\n\n此操作无法撤销！"
      )
    ) {
      return;
    }

    try {
      setCleaning(true);

      if (typeof window === "undefined") {
        throw new Error("服务端渲染时无法清空存储");
      }

      const authData = localStorage.getItem("auth");
      if (!authData) {
        throw new Error("未找到认证信息");
      }

      const auth = JSON.parse(authData);
      if (!auth.accessToken) {
        throw new Error("未找到访问令牌");
      }

      // 调用清空存储 API
      const response = await fetch(
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev/api/clear-storage",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${auth.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        alert(
          `清空完成！删除了 ${
            result.deleted?.r2Objects?.length || 0
          } 个 R2 对象和 ${result.deleted?.dbRecords || 0} 条数据库记录`
        );
      } else {
        throw new Error(result.error || "清空存储失败");
      }
    } catch (err) {
      console.error("Clear storage error:", err);
      alert(err instanceof Error ? err.message : "清空存储失败");
    } finally {
      setCleaning(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">图片画廊</h1>
            <p className="text-xl text-gray-600 mb-8">请先登录以查看您的图片</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">图片画廊</h1>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-600 mt-4">加载中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">图片画廊</h1>
            <p className="text-xl text-gray-600">浏览您上传的所有图片</p>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">欢迎, {user?.login}</span>
            <button
              onClick={clearStorage}
              disabled={cleaning}
              className="bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {cleaning ? "清空中..." : "清空存储"}
            </button>
            <Link
              href="/upload"
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              上传新图片
            </Link>
            <Link
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg
                  className="h-5 w-5 text-red-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">加载失败</h3>
                <div className="mt-2 text-sm text-red-700">
                  {error instanceof Error ? error.message : "获取图片列表失败"}
                </div>
              </div>
            </div>
          </div>
        )}

        {images.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <div className="text-gray-500">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                暂无图片
              </h3>
              <p className="text-gray-600 mb-6">
                您还没有上传任何图片，开始上传您的第一张图片吧！
              </p>
              <Link
                href="/upload"
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
              >
                开始上传
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {images.map((image: ImageRecord) => (
              <div
                key={image.id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="aspect-square bg-gray-100 relative">
                  <Image
                    src={image.url}
                    alt={image.fileName}
                    fill
                    className="object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJMMTMuMDkgOC4yNkwyMCA5TDEzLjA5IDE1Ljc0TDEyIDIyTDEwLjkxIDE1Ljc0TDQgOUwxMC45MSA4LjI2TDEyIDJaIiBzdHJva2U9IiM5Q0EzQUYiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=";
                    }}
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate">
                    {image.fileName}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {formatFileSize(image.size)} •{" "}
                    {formatDate(image.uploadedAt)}
                  </p>
                  <div className="mt-3 flex space-x-2">
                    <a
                      href={image.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-center py-2 px-3 rounded text-sm font-medium transition-colors"
                    >
                      查看
                    </a>
                    <button
                      onClick={() => openCopyModal(image)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-center py-2 px-3 rounded text-sm font-medium transition-colors"
                    >
                      复制
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteImage(image.id, image.r2ObjectKey)
                      }
                      disabled={deleteMutation.isPending}
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-center py-2 px-3 rounded text-sm font-medium transition-colors"
                    >
                      {deleteMutation.isPending ? "删除中..." : "删除"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 复制模态框 */}
        {showCopyModal && selectedImage && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">复制引用</h3>
                <button
                  onClick={() => setShowCopyModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mb-4">
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.fileName}
                  width={400}
                  height={192}
                  className="w-full h-48 object-cover rounded-lg"
                  unoptimized
                />
                <p className="text-sm text-gray-600 mt-2">
                  {selectedImage.fileName}
                </p>
              </div>

              <div className="space-y-3">
                {copyFormats.map((format, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium text-sm">{format.name}</span>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            format.format(
                              selectedImage.url,
                              selectedImage.fileName
                            )
                          )
                        }
                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                      >
                        复制
                      </button>
                    </div>
                    <div className="bg-gray-50 p-2 rounded text-sm font-mono break-all">
                      {format.format(selectedImage.url, selectedImage.fileName)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// QueryClient 实例
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function GalleryPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <GalleryContent />
    </QueryClientProvider>
  );
}
