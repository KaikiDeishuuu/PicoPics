"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  FileText,
  Globe,
  Image,
  Info,
  Shield,
  Upload,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { QuotaBadge } from "@/components/QuotaBadge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToastManager, useToast } from "@/components/Toast";
import { UploadCard } from "@/components/UploadCard";
import {
  AnimatedDiv,
  cardHoverVariants,
  listItemVariants,
  pageTransition,
  pageVariants,
  pulseVariants,
  StaggerContainer,
} from "@/components/ui/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicBackground } from "@/components/ui/dynamic-background";
import { Footer } from "@/components/ui/footer";
import { LoadingSpinner } from "@/components/ui/loading";
import { useNotifications } from "@/lib/hooks/use-notifications";
import { useUploadImage } from "@/lib/hooks/use-queries";

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
  const router = useRouter();
  const { toast } = useToast();
  useNotifications(); // 初始化通知服务

  const uploadMutation = useUploadImage(accessToken || undefined);

  // 认证检查
  useEffect(() => {
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("auth");
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        if (auth.user && auth.accessToken) {
          setUser(auth.user);
          setAccessToken(auth.accessToken);
          setLoading(false);
        } else {
          alert("Please login to use upload feature");
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to parse auth data:", error);
        localStorage.removeItem("auth");
        alert("请先登录以使用上传功能");
        router.push("/");
      }
    } else {
      alert("请先登录以使用上传功能");
      router.push("/");
    }
  }, [router]);

  // 处理上传成功
  useEffect(() => {
    if (uploadMutation.isSuccess && !isNavigating) {
      setUploadStatus("success");
      setUploadProgress(100);
      toast.success("上传成功", "图片已成功上传到云端");

      // 延迟跳转，给用户时间看到成功消息
      const timer = setTimeout(() => {
        setIsNavigating(true);
        router.push("/gallery?refresh=" + Date.now());
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [uploadMutation.isSuccess, isNavigating, toast, router]);

  // 处理上传错误
  useEffect(() => {
    if (uploadMutation.isError) {
      setUploadStatus("error");
      toast.error("上传失败", "图片上传失败，请重试");

      // 2.5秒后重置状态
      setTimeout(() => {
        setUploadStatus("idle");
        setUploadProgress(0);
      }, 2500);
    }
  }, [uploadMutation.isError, toast]);

  if (loading) {
    return (
      <DynamicBackground variant="aurora" intensity="medium" speed="slow" className="min-h-screen">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <LoadingSpinner size="lg" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent mb-6">
              Loading upload page...
            </h1>
          </div>
        </div>
      </DynamicBackground>
    );
  }

  return (
    <DynamicBackground variant="aurora" intensity="medium" speed="slow" className="min-h-screen">
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="container mx-auto px-4 py-4 md:py-8"
      >
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
                    <CardTitle className="text-xl md:text-2xl flex items-center space-x-2 text-white">
                      <Upload className="h-5 w-5 md:h-6 md:w-6 text-blue-400" />
                      <span>Image Upload</span>
                    </CardTitle>
                    <CardDescription className="text-sm md:text-base text-white/80">
                      Welcome back, {user?.login}! Start uploading your images
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
                        router.push("/gallery?refresh=" + Date.now());
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
        </motion.div>

        {/* 上传状态指示器 */}
        <AnimatePresence>
          {uploadStatus !== "idle" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-8 relative z-10"
            >
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
                      <motion.div
                        variants={pulseVariants}
                        animate="pulse"
                        className="flex-shrink-0"
                      >
                        <LoadingSpinner size="lg" />
                      </motion.div>
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
                          <motion.div
                            className="bg-blue-600 h-2 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${uploadProgress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                      )}
                      {uploadStatus === "success" && (
                        <div className="mt-4 flex gap-3">
                          <Button
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={() => {
                              if (!isNavigating) {
                                setIsNavigating(true);
                                router.push("/gallery?refresh=" + Date.now());
                              }
                            }}
                            disabled={isNavigating}
                          >
                            前往画廊
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-gray-300 text-gray-700 hover:bg-gray-100"
                            onClick={() => {
                              if (!isNavigating) {
                                setIsNavigating(true);
                                router.push("/");
                              }
                            }}
                            disabled={isNavigating}
                          >
                            返回首页
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 主要内容区域 */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* 上传区域 */}
          <div className="lg:col-span-2">
            <motion.div
              variants={cardHoverVariants}
              initial="rest"
              whileHover="hover"
              className="mb-8"
            >
              <Card className="card-modern border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Upload className="h-5 w-5 text-blue-600" />
                    <span>拖拽上传</span>
                  </CardTitle>
                  <CardDescription>支持多种图片格式，最大 10MB</CardDescription>
                </CardHeader>
                <CardContent>
                  <UploadCard
                    onUpload={async (file, onProgress) => {
                      console.log("Starting upload for file:", file.name, file.size, file.type);
                      setUploadStatus("uploading");
                      setUploadProgress(0);
                      try {
                        // 调用实际的上传API
                        const result = await uploadMutation.mutateAsync({
                          file,
                          onProgress,
                        });
                        console.log("Upload result:", result);
                        // 成功状态由useEffect处理，这里不需要重复设置
                      } catch (error) {
                        console.error("Upload error:", error);
                        console.error("Error details:", {
                          message: error instanceof Error ? error.message : String(error),
                          stack: error instanceof Error ? error.stack : undefined,
                        });
                        setUploadStatus("error");
                        toast.error("Upload Failed", "Failed to upload image");
                      }
                    }}
                  />
                </CardContent>
              </Card>
            </motion.div>

            {/* 上传提示 */}
            <motion.div
              variants={cardHoverVariants}
              initial="rest"
              whileHover="hover"
              className="mb-8"
            >
              <Card className="card-modern border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Info className="h-5 w-5 text-blue-600" />
                    <span>上传提示</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">支持的格式</h4>
                        <p className="text-sm text-gray-600">JPG, PNG, GIF, WebP, SVG</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">文件大小</h4>
                        <p className="text-sm text-gray-600">单个文件最大 10MB</p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="font-medium">批量上传</h4>
                        <p className="text-sm text-gray-600">支持同时选择多个文件</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* 侧边栏 */}
          <div className="space-y-6">
            {/* 用户配额 */}
            <motion.div variants={cardHoverVariants} initial="rest" whileHover="hover">
              <Card className="card-modern border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-green-600" />
                    <span>使用配额</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <QuotaBadge used={0} limit={100000000} />
                </CardContent>
              </Card>
            </motion.div>

            {/* 功能特性 */}
            <motion.div variants={cardHoverVariants} initial="rest" whileHover="hover">
              <Card className="card-modern border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Zap className="h-5 w-5 text-yellow-600" />
                    <span>平台特性</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      {
                        icon: Zap,
                        title: "极速上传",
                        description: "Cloudflare Workers 边缘计算",
                        color: "text-yellow-600",
                      },
                      {
                        icon: Shield,
                        title: "安全可靠",
                        description: "企业级安全防护",
                        color: "text-green-600",
                      },
                      {
                        icon: Globe,
                        title: "全球加速",
                        description: "Vercel 全球 CDN 网络",
                        color: "text-blue-600",
                      },
                    ].map((feature, index) => (
                      <motion.div
                        key={index}
                        variants={listItemVariants}
                        custom={index}
                        className="flex items-start space-x-3"
                      >
                        <feature.icon className={`h-5 w-5 ${feature.color} mt-0.5 flex-shrink-0`} />
                        <div>
                          <h4 className="font-medium">{feature.title}</h4>
                          <p className="text-sm text-gray-600">{feature.description}</p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* 快速操作 */}
            <motion.div variants={cardHoverVariants} initial="rest" whileHover="hover">
              <Card className="card-modern border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span>快速操作</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Link href="/gallery">
                    <Button variant="outline" className="w-full justify-start">
                      <Image className="h-4 w-4 mr-2" />
                      查看我的图片
                    </Button>
                  </Link>
                  <Link href="/admin">
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="h-4 w-4 mr-2" />
                      管理面板
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <Footer />
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

export default function UploadPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastManager toasts={[]} onClose={() => {}} />
      <UploadPageContent />
    </QueryClientProvider>
  );
}
