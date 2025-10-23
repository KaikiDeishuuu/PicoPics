"use client";

import { useState, useEffect } from "react";

// 强制动态渲染，避免静态化
export const dynamic = "force-dynamic";
import { motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UploadCard } from "@/components/UploadCard";
import { QuotaBadge } from "@/components/QuotaBadge";
import { ToastManager, useToast } from "@/components/Toast";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUploadImage } from "@/lib/hooks/use-queries";

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
  const [quota, setQuota] = useState({ used: 0, limit: 100 * 1024 * 1024 }); // 100MB default
  const { toasts, toast, removeToast } = useToast();
  const router = useRouter();

  // React Query hooks
  const uploadMutation = useUploadImage(accessToken || undefined);

  useEffect(() => {
    // 检查认证状态
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("auth");
    if (!authData) {
      alert("请先登录以使用上传功能");
      router.push("/");
      return;
    }

    try {
      const auth = JSON.parse(authData);
      if (auth.user && auth.accessToken) {
        setUser(auth.user);
        setAccessToken(auth.accessToken);
      } else {
        router.push("/");
      }
    } catch (error) {
      console.error("Failed to parse auth data:", error);
      router.push("/");
    } finally {
      setLoading(false);
    }
  }, [router]);

  const handleUpload = async (
    file: File,
    onProgress: (progress: number) => void
  ): Promise<void> => {
    if (!accessToken) {
      throw new Error("未找到访问令牌");
    }

    // 使用 React Query mutation
    await uploadMutation.mutateAsync(
      { file, onProgress },
      {
        onSuccess: () => {
          toast.success("上传成功！", `文件 ${file.name} 已成功上传`);
          // 更新配额
          setQuota((prev) => ({
            ...prev,
            used: prev.used + file.size,
          }));
        },
        onError: (error) => {
          toast.error("上传失败", error.message);
          throw error;
        },
      }
    );
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </motion.div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-gray-900 mb-4">需要登录</h1>
          <p className="text-gray-600 mb-6">请先登录以使用上传功能</p>
          <Link href="/">
            <Button>返回首页</Button>
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* 头部 */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center space-x-4">
            <Link href="/gallery">
              <Button variant="outline" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                返回画廊
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">上传图片</h1>
              <p className="text-gray-600">拖拽文件到下方区域或点击选择文件</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm text-muted-foreground">
              欢迎, {user.login}
            </span>
            <ThemeToggle />
            <Link href="/gallery">
              <Button variant="outline">查看我的图片</Button>
            </Link>
          </div>
        </motion.div>

        {/* 配额显示 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <QuotaBadge used={quota.used} limit={quota.limit} />
        </motion.div>

        {/* 上传区域 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto"
        >
          <UploadCard
            onUpload={handleUpload}
            maxSize={10 * 1024 * 1024} // 10MB
            acceptedTypes={[
              "image/jpeg",
              "image/png",
              "image/gif",
              "image/webp",
            ]}
            className="bg-white shadow-lg"
          />
        </motion.div>

        {/* 使用说明 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto mt-8"
        >
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              使用说明
            </h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li>• 支持 JPEG、PNG、GIF、WebP 格式</li>
              <li>• 单个文件最大 10MB</li>
              <li>• 支持拖拽上传和点击选择</li>
              <li>• 上传后会自动生成分享链接</li>
              <li>• 图片会经过内容审核</li>
            </ul>
          </div>
        </motion.div>
      </div>

      {/* Toast 通知 */}
      <ToastManager toasts={toasts} onClose={removeToast} />
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

export default function UploadPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <UploadPageContent />
    </QueryClientProvider>
  );
}
