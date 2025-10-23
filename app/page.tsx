"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// 强制动态渲染，避免静态化
export const dynamic = "force-dynamic";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    login: string;
    [key: string]: unknown;
  } | null>(null);

  // 添加运行时检查，确保动态渲染
  const [mounted, setMounted] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    // 检查本地存储中的认证状态
    if (typeof window === "undefined" || authChecked) return;

    const checkAuth = () => {
      const authData = localStorage.getItem("auth");
      if (authData) {
        try {
          const auth = JSON.parse(authData);
          if (auth.user && auth.accessToken) {
            setIsAuthenticated(true);
            setUser(auth.user);
            setAuthChecked(true);
            return true;
          }
        } catch (error) {
          console.error("Failed to parse auth data:", error);
          // 清除无效的认证数据
          localStorage.removeItem("auth");
        }
      }
      setAuthChecked(true);
      return false;
    };

    const isAuth = checkAuth();
    if (!isAuth) {
      setIsAuthenticated(false);
      setUser(null);
    }
  }, [authChecked]);

  const handleGitHubLogin = () => {
    // GitHub OAuth 登录逻辑
    const clientId =
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "Ov23lijBobxzGOfTVu9U";
    if (!clientId) {
      alert("GitHub OAuth 未配置");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/callback`;
    const scope = "user:email";
    const state = Math.random().toString(36).substring(7);

    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${scope}&state=${state}`;

    window.location.href = authUrl;
  };

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth");
    }
    setIsAuthenticated(false);
    setUser(null);
  };

  // 确保客户端渲染
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-gray-900 mb-6">
              PicoPicsV2
            </h1>
            <p className="text-xl text-gray-600 mb-8">加载中...</p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        {/* 导航栏 */}
        <nav className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold text-gray-900">PicoPicsV2</h1>
          </div>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <>
                <span className="text-gray-700">欢迎, {user?.login}</span>
                <Link
                  href="/admin"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  管理面板
                </Link>
                <button
                  onClick={handleLogout}
                  className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  退出登录
                </button>
              </>
            ) : (
              <button
                onClick={handleGitHubLogin}
                className="bg-gray-900 hover:bg-gray-800 text-white px-4 py-2 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>GitHub 登录</span>
              </button>
            )}
          </div>
        </nav>

        <div className="text-center">
          <h1 className="text-6xl font-bold text-gray-900 mb-6">PicoPicsV2</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            现代化图片上传和分享平台，支持流式上传、实时预览和智能压缩
          </p>
          <div className="space-x-4">
            <Link
              href="/upload"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              开始上传
            </Link>
            <Link
              href="/gallery"
              className="inline-block bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-8 rounded-lg border border-gray-300 transition-colors"
            >
              浏览图片
            </Link>
          </div>
        </div>

        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-blue-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">流式上传</h3>
            <p className="text-gray-600">支持大文件流式上传，实时显示进度</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">智能验证</h3>
            <p className="text-gray-600">自动验证文件类型和大小，确保安全</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-purple-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">高速分发</h3>
            <p className="text-gray-600">基于Cloudflare全球CDN，快速访问</p>
          </div>
        </div>
      </div>
    </main>
  );
}
