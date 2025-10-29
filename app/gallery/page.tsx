"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { AnimatedWelcome } from "@/components/ui/animated-welcome";
import {
  ArrowLeft,
  Download,
  Filter,
  Grid,
  Image as ImageIcon,
  List,
  RefreshCw,
  Search,
  Share2,
  Trash2,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AnimatedDiv,
  cardHoverVariants,
  listItemVariants,
  pageTransition,
  pageVariants,
  StaggerContainer,
} from "@/components/ui/animations";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DynamicBackground } from "@/components/ui/dynamic-background";
import { Footer } from "@/components/ui/footer";
import { ImageGallery } from "@/components/ui/gallery";
import { ImageBadge, SimpleImageBadge } from "@/components/ui/image-badge";
import { LoadingSpinner } from "@/components/ui/loading";
import {
  ImageGridSkeleton,
  ModernLoading,
} from "@/components/ui/modern-loading";
import {
  NotificationContainer,
  useNotifications,
} from "@/components/ui/notification";
import { useDeleteImage, useUserImages } from "@/lib/hooks/use-queries";

// 强制动态渲染
export const dynamic = "force-dynamic";

interface User {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

interface ImageRecord {
  id: string;
  url: string;
  filename: string;
  uploadDate: string;
  size: number;
  mimeType: string;
}

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
  const { notifications, addNotification, removeNotification } =
    useNotifications();

  // React Query hooks
  const {
    data: imagesResponse,
    isLoading,
    error,
    refetch,
  } = useUserImages(accessToken || undefined);

  // 处理API响应数据
  const images =
    imagesResponse?.success && Array.isArray(imagesResponse.data)
      ? imagesResponse.data
      : [];
  const deleteMutation = useDeleteImage(accessToken || undefined);

  // 调试信息

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
        }
      } catch (error) {
        console.error("Failed to parse auth data:", error);
        localStorage.removeItem("auth");
      }
    }
  }, []);

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

  // 过滤和排序图片
  const filteredImages = images
    .filter((image: any) => {
      const matchesSearch = image.fileName
        ? image.fileName.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      const matchesFilter =
        filterBy === "all" ||
        (filterBy === "images" && image.type?.startsWith("image/")) ||
        (filterBy === "videos" && image.type?.startsWith("video/"));
      return matchesSearch && matchesFilter;
    })
    .sort((a: any, b: any) => {
      switch (sortBy) {
        case "name":
          return (a.fileName || "").localeCompare(b.fileName || "");
        case "size":
          return (b.size || 0) - (a.size || 0);
        default:
          return (
            new Date(b.uploadedAt || 0).getTime() -
            new Date(a.uploadedAt || 0).getTime()
          );
      }
    });

  // 调试filteredImages

  // 测试API调用
  useEffect(() => {
    if (accessToken) {
      fetch(
        "https://history-worker-v2-prod.haoweiw370.workers.dev/api/history",
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
        .then((response) => {
          return response.json();
        })
        .then((data) => {})
        .catch((error) => {
          console.error("API Call Error:", error);
        });
    }
  }, [accessToken]);

  // 处理图片删除
  const handleDeleteImage = async (imageId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this image? This action cannot be undone."
      )
    ) {
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
    } catch (error) {
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
      await Promise.all(
        selectedImages.map((imageId) => deleteMutation.mutateAsync(imageId))
      );
      setSelectedImages([]);
      setIsSelectMode(false);
      addNotification({
        type: "success",
        title: "Batch Delete Successful",
        message: `Deleted ${selectedImages.length} images`,
        duration: 3000,
      });
    } catch (error) {
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
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center"
      >
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
      </motion.div>
    );
  }

  return (
    <DynamicBackground
      variant="cosmic"
      intensity="low"
      speed="slow"
      className="min-h-screen"
    >
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="min-h-screen"
      >
        <div className="container mx-auto px-4 py-4 md:py-8">
          {/* 头部导航 */}
          <motion.div
            variants={cardHoverVariants}
            initial="rest"
            whileHover="hover"
            className="mb-4 md:mb-8"
          >
            <Card className="card-modern">
              <CardHeader>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
                    <Link href="/">
                      <Button
                        variant="outline"
                        size="sm"
                        className="bg-card/80 backdrop-blur-md border border-border text-foreground hover:bg-muted/50 relative z-50"
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Back to Home</span>
                        <span className="sm:hidden">Back</span>
                      </Button>
                    </Link>
                    <div>
                      <CardTitle className="text-xl md:text-2xl text-foreground">
                        My Gallery
                      </CardTitle>
                      <CardDescription className="text-sm md:text-base text-muted-foreground">
                        <AnimatedWelcome
                          username={user?.login || "User"}
                          message={`Welcome back, {username}! You have ${images.length} images`}
                          variant="fade"
                        />
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRefresh}
                      disabled={isLoading}
                    >
                      <RefreshCw
                        className={`h-4 w-4 mr-2 ${
                          isLoading ? "animate-spin" : ""
                        }`}
                      />
                      Refresh
                    </Button>
                    <Link href="/upload">
                      <Button size="sm">
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Images
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardHeader>
            </Card>
          </motion.div>

          {/* 搜索和筛选 */}
          <motion.div
            variants={cardHoverVariants}
            initial="rest"
            whileHover="hover"
            className="mb-6"
          >
            <Card className="card-modern">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  {/* 搜索框 */}
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

                  {/* 筛选器 */}
                  <div className="flex gap-2">
                    <select
                      value={filterBy}
                      onChange={(e) =>
                        setFilterBy(
                          e.target.value as "all" | "images" | "videos"
                        )
                      }
                      className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-card text-foreground text-sm font-medium shadow-sm hover:border-blue-400/50 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiA5TDkgNkgzTDYgOVoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPg==')] bg-no-repeat bg-right-2 bg-[length:14px] pr-9"
                    >
                      <option value="all">All Files</option>
                      <option value="images">Images Only</option>
                      <option value="videos">Videos Only</option>
                    </select>

                    <select
                      value={sortBy}
                      onChange={(e) =>
                        setSortBy(e.target.value as "date" | "name" | "size")
                      }
                      className="px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 bg-card text-foreground text-sm font-medium shadow-sm hover:border-blue-400/50 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIiIGhlaWdodD0iMTIiIHZpZXdCb3g9IjAgMCAxMiAxMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNNiA5TDkgNkgzTDYgOVoiIGZpbGw9ImN1cnJlbnRDb2xvciIvPjwvc3ZnPg==')] bg-no-repeat bg-right-2 bg-[length:14px] pr-9"
                    >
                      <option value="date">By Date</option>
                      <option value="name">By Name</option>
                      <option value="size">By Size</option>
                    </select>

                    <div className="flex border border-white/20 rounded-lg overflow-hidden">
                      <button
                        onClick={() => setViewMode("grid")}
                        className={`px-3 py-2 transition-colors ${
                          viewMode === "grid"
                            ? "bg-blue-500 text-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
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
                      >
                        <List className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* 批量操作栏 */}
          <AnimatePresence>
            {isSelectMode && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="mb-6"
              >
                <Card className="card-modern border-blue-400">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-foreground">
                          已选择 {selectedImages.length} 张图片
                        </span>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleBatchDelete}
                          disabled={selectedImages.length === 0}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          批量删除
                        </Button>
                      </div>
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
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 图片网格 */}
          <StaggerContainer className="mb-8">
            {isLoading ? (
              <div className="space-y-6">
                <ModernLoading
                  message="Loading your images..."
                  variant="skeleton"
                  size="lg"
                  className="text-center"
                />
                <ImageGridSkeleton count={8} />
              </div>
            ) : error || (imagesResponse && !imagesResponse.success) ? (
              <Card className="card-modern">
                <CardContent className="text-center py-12">
                  <div className="mb-4">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4 text-red-400" />
                    <h3 className="text-lg font-medium text-foreground">
                      加载失败
                    </h3>
                    <p className="text-sm text-muted-foreground mt-2">
                      {error?.message ||
                        imagesResponse?.error ||
                        "无法加载图片列表，请检查网络连接"}
                    </p>
                  </div>
                  <Button onClick={handleRefresh} variant="outline">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重试
                  </Button>
                </CardContent>
              </Card>
            ) : filteredImages.length === 0 ? (
              <Card className="card-modern">
                <CardContent className="text-center py-12">
                  <div className="text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">暂无图片</h3>
                    <p className="text-sm text-gray-500 mt-2">
                      {searchTerm
                        ? "没有找到匹配的图片"
                        : "开始上传您的第一张图片吧"}
                    </p>
                  </div>
                  <Link href="/upload">
                    <Button className="mt-4">
                      <Upload className="h-4 w-4 mr-2" />
                      上传图片
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <ImageGallery
                images={filteredImages.map((image: any) => ({
                  id: image.id || "",
                  src: image.url || "",
                  alt: image.fileName || "Image",
                  filename: image.fileName || "unknown",
                  uploadDate: image.uploadedAt || new Date().toISOString(),
                  size: image.size || 0,
                }))}
                onDelete={handleDeleteImage}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
              />
            )}
          </StaggerContainer>
        </div>

        {/* Footer */}
        <Footer />

        {/* 通知容器 */}
        <NotificationContainer
          notifications={notifications}
          onClose={removeNotification}
          position="top-right"
        />
      </motion.div>
    </DynamicBackground>
  );
}

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
