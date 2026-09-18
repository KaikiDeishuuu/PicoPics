"use client";

import {
  ArrowLeft,
  Grid,
  Image as ImageIcon,
  List,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { QueryProvider } from "@/components/query-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/ui/footer";
import { ImageGallery } from "@/components/ui/gallery";
import { LoadingSpinner } from "@/components/ui/loading";
import { NotificationContainer, useNotifications } from "@/components/ui/notification";
import type { ImageHistoryRecord } from "@/lib/api";
import { useDeleteImage, useUserImagesInfinite } from "@/lib/hooks/use-queries";

// 强制动态渲染
export const dynamic = "force-dynamic";

interface User {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

const FILTER_SELECT_CLASS =
  "px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-card text-foreground text-sm font-medium shadow-sm hover:border-blue-400/50 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiA5TDkgNkgzTDYgOVoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPg==')] bg-no-repeat bg-right-2 bg-[length:14px] pr-9";

function GalleryContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState<"date" | "name" | "size">("date");
  const [filterBy, setFilterBy] = useState<"all" | "images" | "videos">("all");
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const router = useRouter();
  const { notifications, addNotification, removeNotification } = useNotifications();
  const sentinelRef = useRef<HTMLDivElement>(null);

  // React Query hooks（分页：滚动到底部自动加载下一页）
  const {
    data: pagesData,
    isLoading,
    error,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useUserImagesInfinite(accessToken || undefined);

  let images: ImageHistoryRecord[] = [];
  const allPages = pagesData?.pages ?? [];
  for (let i = 0; i < allPages.length; i++) {
    const page = allPages[i];
    if (page.success && Array.isArray(page.data)) {
      images = images.concat(page.data);
    }
  }
  const totalCount = allPages.length > 0 ? (allPages[0].pagination?.total ?? images.length) : 0;

  const deleteMutation = useDeleteImage(accessToken || undefined);

  // 认证检查
  useEffect(() => {
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("auth");
    if (authData) {
      try {
        const auth = JSON.parse(authData);

        if (auth.user && auth.accessToken) {
          setIsAuthenticated(true);
          setUser(auth.user);
          setAccessToken(auth.accessToken);
        } else {
          localStorage.removeItem("auth");
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to parse auth data:", error);
        localStorage.removeItem("auth");
        router.push("/");
      }
    } else {
      router.push("/");
    }
  }, [router]);

  // 检查 URL 参数中的 refresh 标志
  useEffect(() => {
    if (typeof window === "undefined") return;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("refresh")) {
      // 刷新数据
      refetch();
      // 清理 URL 参数
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [refetch]);

  // 滚动到底部附近时自动加载下一页
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "600px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  // 过滤和排序图片
  const filteredImages = images
    .filter((image: ImageHistoryRecord) => {
      const matchesSearch = image.fileName
        ? image.fileName.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "images" && image.type?.startsWith("image/")) ||
        (filterBy === "videos" && image.type?.startsWith("video/"));
      return matchesSearch && matchesFilter;
    })
    .sort((a: ImageHistoryRecord, b: ImageHistoryRecord) => {
      switch (sortBy) {
        case "name":
          return (a.fileName || "").localeCompare(b.fileName || "");
        case "size":
          return (b.size || 0) - (a.size || 0);
        default:
          return new Date(b.uploadedAt || 0).getTime() - new Date(a.uploadedAt || 0).getTime();
      }
    });

  // 处理图片删除
  const handleDeleteImage = async (imageId: string) => {
    if (!confirm("Are you sure you want to delete this image? This action cannot be undone.")) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(imageId);
      addNotification({
        type: "success",
        title: "Delete Successful",
        message: "Image has been successfully deleted",
        duration: 3000,
      });
    } catch (_error) {
      addNotification({
        type: "error",
        title: "Delete Failed",
        message: "Unable to delete image, please try again",
        duration: 5000,
      });
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedImages.length === 0) return;

    if (
      !confirm(
        `Are you sure you want to delete the selected ${selectedImages.length} images? This action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      await Promise.all(selectedImages.map((imageId) => deleteMutation.mutateAsync(imageId)));
      setSelectedImages([]);
      setIsSelectMode(false);
      addNotification({
        type: "success",
        title: "Batch Delete Successful",
        message: `Deleted ${selectedImages.length} images`,
        duration: 3000,
      });
    } catch (_error) {
      addNotification({
        type: "error",
        title: "Batch Delete Failed",
        message: "Some images failed to delete, please try again",
        duration: 5000,
      });
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    refetch();
    addNotification({
      type: "info",
      title: "Refreshing",
      message: "Updating image list",
      duration: 2000,
    });
  };

  // 如果没有认证，重定向到首页
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">需要登录</CardTitle>
            <CardDescription>请先登录以查看您的图片</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回首页
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4 md:py-6">
        {/* 工具栏：标题 + 搜索/筛选/视图 一体，紧凑单卡 */}
        <Card className="card-modern mb-4">
          <CardContent className="pt-4 pb-4 px-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <Link href="/">
                  <Button variant="outline" size="sm" className="relative z-50">
                    <ArrowLeft className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Back</span>
                  </Button>
                </Link>
                <div className="min-w-0">
                  <CardTitle className="text-lg text-foreground">My Gallery</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground truncate">
                    {user?.login || "User"} · 已加载 {images.length} / {totalCount} 张
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline ml-1">Refresh</span>
                </Button>
                <Link href="/upload">
                  <Button size="sm">
                    <Upload className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                </Link>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-2 md:items-center pt-3 border-t border-border">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search images..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-card text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <select
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value as "all" | "images" | "videos")}
                  className={FILTER_SELECT_CLASS}
                >
                  <option value="all">All Files</option>
                  <option value="images">Images Only</option>
                  <option value="videos">Videos Only</option>
                </select>

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "date" | "name" | "size")}
                  className={FILTER_SELECT_CLASS}
                >
                  <option value="date">By Date</option>
                  <option value="name">By Name</option>
                  <option value="size">By Size</option>
                </select>

                <div className="flex border border-border rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`px-3 py-2 transition-colors ${
                      viewMode === "grid"
                        ? "bg-blue-500 text-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    type="button"
                    aria-label="Grid view"
                  >
                    <Grid className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`px-3 py-2 transition-colors ${
                      viewMode === "list"
                        ? "bg-blue-500 text-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}
                    type="button"
                    aria-label="List view"
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 批量操作栏（仅选择模式显示） */}
        {isSelectMode && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-400 bg-card px-4 py-2">
            <span className="text-sm font-medium text-foreground">
              已选择 {selectedImages.length} 张图片
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBatchDelete}
                disabled={selectedImages.length === 0}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                批量删除
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedImages([]);
                }}
              >
                取消选择
              </Button>
            </div>
          </div>
        )}

        {/* 图片网格 */}
        <div className="mb-6">
          {isLoading ? (
            <div className="text-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-3 text-muted-foreground text-sm">Loading your images...</p>
            </div>
          ) : error || (allPages.length > 0 && !allPages[0].success) ? (
            <Card className="card-modern">
              <CardContent className="text-center py-10">
                <ImageIcon className="h-10 w-10 mx-auto mb-3 text-red-400" />
                <h3 className="text-lg font-medium text-foreground">加载失败</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {error?.message || allPages[0]?.error || "无法加载图片列表，请检查网络连接"}
                </p>
                <Button onClick={handleRefresh} variant="outline" className="mt-4">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  重试
                </Button>
              </CardContent>
            </Card>
          ) : filteredImages.length === 0 ? (
            <Card className="card-modern">
              <CardContent className="text-center py-10">
                <ImageIcon className="h-10 w-10 mx-auto mb-3 text-gray-500" />
                <h3 className="text-lg font-medium">暂无图片</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {searchTerm ? "没有找到匹配的图片" : "开始上传您的第一张图片吧"}
                </p>
                <Link href="/upload">
                  <Button className="mt-4">
                    <Upload className="h-4 w-4 mr-2" />
                    上传图片
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <ImageGallery
                images={filteredImages.map((image: ImageHistoryRecord) => ({
                  id: image.id || "",
                  src: image.url || "",
                  alt: image.fileName || "Image",
                  filename: image.fileName || "unknown",
                  uploadDate: image.uploadedAt || new Date().toISOString(),
                  size: image.size || 0,
                }))}
                onDelete={handleDeleteImage}
                className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3"
              />
              {/* 无限滚动哨兵 + 手动加载兜底 */}
              <div ref={sentinelRef} className="h-1" />
              <div className="mt-4 text-center">
                {isFetchingNextPage ? (
                  <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <LoadingSpinner size="sm" />
                    加载更多...
                  </div>
                ) : hasNextPage ? (
                  <Button variant="outline" size="sm" onClick={() => fetchNextPage()}>
                    加载更多（{images.length} / {totalCount}）
                  </Button>
                ) : (
                  images.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      已全部加载（共 {totalCount} 张）
                    </p>
                  )
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <Footer />

        {/* 通知容器 */}
        <NotificationContainer
          notifications={notifications}
          onClose={removeNotification}
          position="top-right"
        />
      </div>
    </div>
  );
}

export default function GalleryPage() {
  return (
    <QueryProvider>
      <GalleryContent />
    </QueryProvider>
  );
}
