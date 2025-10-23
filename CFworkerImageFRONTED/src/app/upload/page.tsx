"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import GitHubLogin from "../../components/GitHubLogin";
import UserInfo from "../../components/UserInfo";
import UploadZone from "../../components/UploadZone";
import { getAuth, type GitHubUser } from "../../services/auth";
import type { UploadSuccessResponse } from "../../types";

export default function UploadPage() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 检查是否已登录
    const auth = getAuth();
    if (auth) {
      setUser(auth.user);
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (user: GitHubUser) => {
    setUser(user);
  };

  const handleLogout = () => {
    setUser(null);
  };

  const handleUploadSuccess = (data: UploadSuccessResponse) => {
    console.log("Upload success:", data);
    // 可以在这里添加成功提示或跳转到结果页面
  };

  const handleUploadError = (error: string) => {
    console.error("Upload error:", error);
    alert(`上传失败: ${error}`);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-orange-400"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-4">
              PicoPics V2
            </h1>
            <p className="text-xl text-white/60">现代化的图片上传和分享平台</p>
          </motion.div>

          {/* Main Content */}
          <div className="grid gap-8 md:grid-cols-2">
            {/* Auth Section */}
            <div className="space-y-6">
              {user ? (
                <UserInfo user={user} onLogout={handleLogout} />
              ) : (
                <GitHubLogin
                  onSuccess={handleLoginSuccess}
                  onError={(error) => {
                    console.error("Login error:", error);
                    alert(`登录失败: ${error}`);
                  }}
                />
              )}
            </div>

            {/* Upload Section */}
            <div className="space-y-6">
              {user ? (
                <UploadZone
                  accessToken={getAuth()?.accessToken}
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              ) : (
                <motion.div
                  className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-2xl"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.2 }}
                >
                  <div className="text-center space-y-4">
                    <div className="h-16 w-16 mx-auto rounded-full bg-white/10 flex items-center justify-center">
                      <svg
                        className="h-8 w-8 text-white/40"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                        />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-white">
                      请先登录
                    </h3>
                    <p className="text-white/60">
                      使用 GitHub 账户登录后即可上传图片
                    </p>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
