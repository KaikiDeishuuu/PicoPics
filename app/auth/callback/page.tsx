"use client";

import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicBackground } from "@/components/ui/dynamic-background";
import { LoadingSpinner } from "@/components/ui/loading";

// 强制动态渲染，避免静态化
export const dynamic = "force-dynamic";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        const state = urlParams.get("state");
        const error = urlParams.get("error");

        if (error) {
          setError(`GitHub OAuth 错误: ${error}`);
          setStatus("error");
          return;
        }

        if (!code) {
          setError("未收到授权码");
          setStatus("error");
          return;
        }

        // 调用后端 API 交换访问令牌
        const response = await fetch(
          "https://uploader-worker-v2-prod.haoweiw370.workers.dev/auth/callback",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              code,
              state,
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.user && data.accessToken) {
          // 保存认证信息到本地存储
          if (typeof window !== "undefined") {
            localStorage.setItem(
              "auth",
              JSON.stringify({
                user: data.user,
                accessToken: data.accessToken,
                timestamp: Date.now(),
              })
            );
          }

          setStatus("success");

          // 延迟跳转到首页
          setTimeout(() => {
            router.push("/");
          }, 2000);
        } else {
          throw new Error(data.error || "认证失败");
        }
      } catch (err) {
        console.error("Auth callback error:", err);
        setError(err instanceof Error ? err.message : "认证失败");
        setStatus("error");
      }
    };

    handleCallback();
  }, [router]);

  if (status === "loading") {
    return (
      <DynamicBackground
        variant="rainbow"
        intensity="medium"
        speed="slow"
        className="min-h-screen"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="min-h-screen flex items-center justify-center"
        >
          <Card className="card-modern max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
              </div>
              <CardTitle className="text-2xl text-foreground">
                Processing Authentication
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                Please wait while we verify your identity...
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </DynamicBackground>
    );
  }

  if (status === "error") {
    return (
      <DynamicBackground
        variant="sunset"
        intensity="medium"
        speed="slow"
        className="min-h-screen"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="min-h-screen flex items-center justify-center"
        >
          <Card className="card-modern max-w-md mx-4">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-red-400" />
              </div>
              <CardTitle className="text-2xl text-red-400">
                Authentication Failed
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">{error}</p>
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="w-full"
              >
                Back to Home
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </DynamicBackground>
    );
  }

  return (
    <DynamicBackground
      variant="ocean"
      intensity="medium"
      speed="slow"
      className="min-h-screen"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="min-h-screen flex items-center justify-center"
      >
        <Card className="card-modern max-w-md mx-4">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-400" />
            </div>
            <CardTitle className="text-2xl text-green-400">
              Authentication Successful
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              You have successfully logged in, redirecting to homepage...
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </DynamicBackground>
  );
}
