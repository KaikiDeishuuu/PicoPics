"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

// 强制动态渲染，避免静态化
export const dynamic = "force-dynamic";

export default function AuthCallback() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
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
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">正在处理认证...</h1>
          <p className="text-gray-600">请稍候，我们正在验证您的身份</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">认证失败</h3>
                <div className="mt-2 text-sm text-red-700">{error}</div>
              </div>
            </div>
          </div>
          <div className="mt-6">
            <button
              onClick={() => router.push("/")}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              返回首页
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 max-w-md mx-auto">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">认证成功</h3>
              <div className="mt-2 text-sm text-green-700">您已成功登录，正在跳转到首页...</div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
