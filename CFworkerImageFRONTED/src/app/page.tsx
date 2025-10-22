/**
 * 主页面
 * 图片上传界面
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import UploadZone from "@/components/UploadZone";
import ResultDisplay from "@/components/ResultDisplay";
import HistoryDisplay from "@/components/HistoryDisplay";
import GitHubLogin from "@/components/GitHubLogin";
import UserInfo from "@/components/UserInfo";
import { getAuth, type GitHubUser } from "@/services/auth";
import type { UploadSuccessResponse, ImageHistoryRecord } from "@/types";

export default function Home() {
  const [uploadResult, setUploadResult] =
    useState<UploadSuccessResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<GitHubUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

  // Load auth from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load auth
      const auth = getAuth();
      if (auth) {
        setCurrentUser(auth.user);
        setAccessToken(auth.accessToken);
      }
    }
  }, []);

  // Listen for localStorage changes to sync auth across tabs
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onStorage = (e: StorageEvent) => {
      if (e.key === null) return;
      if (
        e.key === "github_auth" ||
        e.key === "github_auth_v2" ||
        e.key === "github_token" ||
        e.key === "gh_auth"
      ) {
        const auth = getAuth();
        if (auth) {
          setCurrentUser(auth.user);
          setAccessToken(auth.accessToken);
        } else {
          setCurrentUser(null);
          setAccessToken(null);
        }
      }
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    // Removed: Old localStorage history logic
  }, []);

  const handleUploadSuccess = (data: UploadSuccessResponse) => {
    setUploadResult(data);
    setErrorMessage("");
    // 触发历史记录刷新
    setHistoryRefreshTrigger((prev) => prev + 1);
  };

  const handleUploadError = (error: string) => {
    setErrorMessage(error);
    // Auto clear after 3 seconds
    setTimeout(() => setErrorMessage(""), 3000);
  };

  const handleLoginSuccess = (user: GitHubUser, token: string) => {
    setCurrentUser(user);
    setAccessToken(token);
    setErrorMessage("");
  };

  const handleLoginError = (error: string) => {
    setErrorMessage(error);
    setTimeout(() => setErrorMessage(""), 3000);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAccessToken(null);
  };

  return (
    <div className="min-h-screen">
      {/* 现代艺术感背景 */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <motion.div
          className="animate-aurora absolute -left-56 -top-40 h-[520px] w-[520px] rounded-full bg-gradient-to-br from-orange-500/35 via-pink-500/20 to-purple-600/30 blur-3xl"
          animate={{ rotate: [0, 6, -4, 0] }}
          transition={{ duration: 36, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="animate-orb absolute right-[-180px] top-1/3 h-[420px] w-[420px] rounded-full bg-gradient-to-br from-cyan-400/25 via-sky-500/15 to-indigo-500/25 blur-[140px]"
          animate={{ scale: [0.9, 1.1, 0.95] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="animate-orb absolute bottom-[-160px] left-1/3 h-[380px] w-[460px] rounded-full bg-gradient-to-tr from-amber-400/15 via-orange-500/25 to-rose-500/20 blur-[160px]"
          animate={{ x: [0, 40, -40, 0] }}
          transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:120px_120px] opacity-20" />
      </div>

      {/* 头部 */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 shadow-[0_18px_35px_rgba(10,10,25,0.45)]">
        <div className="max-w-6xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="grid h-8 w-8 sm:h-10 sm:w-10 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 text-white font-bold text-lg sm:text-xl shadow-lg shadow-orange-500/40">
                K
              </div>
              <div>
                <h1 className="text-lg sm:text-2xl font-bold text-white drop-shadow-lg">
                  Kaiki Image
                </h1>
                <p className="text-white/70 text-xs sm:text-sm">
                  Cloudflare R2 + AI Powered
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* 在线状态指示器 */}
              <div className="hidden sm:flex items-center space-x-2">
                <span className="flex items-center space-x-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 shadow-lg shadow-emerald-500/30">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span>Online</span>
                </span>
              </div>

              {/* 管理后台按钮 */}
              <a
                href="/admin"
                className="hidden sm:inline-flex items-center space-x-2 rounded-lg border border-orange-400/40 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 sm:px-4 py-2 text-sm font-medium text-orange-200 transition-all hover:border-orange-400/60 hover:bg-orange-500/30 hover:text-orange-100 hover:shadow-lg hover:shadow-orange-500/20"
                title="管理员后台"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                <span className="hidden md:inline">管理后台</span>
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        {/* Error message */}
        {errorMessage && (
          <div className="mb-6 bg-red-600/30 border border-red-500/50 rounded-xl p-4 shadow-2xl animate-shake">
            <div className="flex items-center">
              <svg
                className="h-5 w-5 text-red-300 mr-3 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Upload Failed
                </h3>
                <p className="text-sm text-red-100 mt-1">{errorMessage}</p>
              </div>
            </div>
          </div>
        )}

        {/* Two Column Layout */}
        <div className="flex flex-col gap-6">
          {/* Upload Section */}
          <div className="flex flex-col items-center space-y-6 lg:items-start">
            {/* GitHub 登录/用户信息 */}
            {currentUser ? (
              <UserInfo user={currentUser} onLogout={handleLogout} />
            ) : (
              <GitHubLogin
                onSuccess={handleLoginSuccess}
                onError={handleLoginError}
              />
            )}

            {/* 上传区域 - 仅在登录后显示 */}
            {currentUser && (
              <>
                <UploadZone
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                  accessToken={accessToken || undefined}
                />

                {/* 结果展示 */}
                {uploadResult && <ResultDisplay data={uploadResult} />}
              </>
            )}

            {/* 未登录提示 */}
            {!currentUser && (
              <div className="relative overflow-hidden rounded-2xl border-gradient p-6 md:p-8 text-white/80 glass-modern-soft w-full">
                <div className="absolute inset-0 opacity-40">
                  <div className="animate-orb absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/35 to-blue-500/25 blur-2xl" />
                </div>
                <div className="relative">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div className="flex-1">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative mb-4">
                          <svg
                            className="mx-auto h-16 w-16 text-white/40"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                            />
                          </svg>
                        </div>
                        <div className="flex-1 md:flex-initial">
                          <h3 className="text-lg font-semibold text-white mb-2">
                            需要登录
                          </h3>
                          <p className="text-sm text-white/70">
                            请使用 GitHub 账号登录后上传图片
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="md:flex-shrink-0">
                      <div className="text-center md:text-right">
                        <p className="text-xs text-white/50 mb-2">
                          安全认证 • 专属存储
                        </p>
                        <div className="flex items-center justify-center md:justify-end gap-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-400/20">
                            <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5"></span>
                            安全可靠
                          </span>
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-400/20">
                            <span className="w-1.5 h-1.5 bg-blue-400 rounded-full mr-1.5"></span>
                            快速上传
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* History Section */}
          <div className="w-full">
            {currentUser && (
              <HistoryDisplay
                key={historyRefreshTrigger}
                onImageClick={(record: ImageHistoryRecord) => {
                  // 将历史记录转换为上传结果格式显示
                  const uploadResult: UploadSuccessResponse = {
                    success: true,
                    url: `https://pic.lambdax.me/${record.r2ObjectKey}`,
                    fileName: record.r2ObjectKey,
                    size: record.fileSize,
                    type: record.mimeType,
                    uploadedAt: record.uploadDate,
                  };
                  setUploadResult(uploadResult);
                }}
              />
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="glass-modern-soft border-gradient relative mt-12 rounded-2xl p-5 md:p-6 w-full">
          <h2 className="mb-4 text-xl font-semibold text-white">How to Use</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="relative rounded-xl border border-white/10 bg-white/10 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5">
              <div className="mb-2 text-white/60">Click</div>
              <p className="text-white/80">Click upload area to select files</p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/10 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5">
              <div className="mb-2 text-white/60">Drag & Drop</div>
              <p className="text-white/80">Drag files to upload area</p>
            </div>
            <div className="relative rounded-xl border border-white/10 bg-white/10 p-4 transition-transform duration-300 hover:-translate-y-1 hover:bg-white/5">
              <div className="mb-2 text-white/60">Paste</div>
              <p className="text-white/80">Press Ctrl+V to paste images</p>
            </div>
          </div>
        </div>

        {/* 特性 */}
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3 w-full">
          <div className="glass-modern-soft border-gradient relative rounded-2xl p-5 transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-white">
                <svg
                  className="w-4 h-4"
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
              <h3 className="text-lg font-semibold text-white">Fast</h3>
            </div>
            <p className="text-sm text-white/70">
              Cloudflare global CDN network
            </p>
          </div>
          <div className="glass-modern-soft border-gradient relative rounded-2xl p-5 transition-transform hover:-translate-y-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-white">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Secure</h3>
            </div>
            <p className="text-sm text-white/70">
              Enterprise storage with daily quota
            </p>
          </div>
          <div className="glass-modern-soft border-gradient relative rounded-2xl p-5 transition-transform hover:-translate-y-1 md:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-white">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">Reliable</h3>
            </div>
            <p className="text-sm text-white/70">
              99.9% uptime with automatic backups
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 bg-white/3 border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center space-y-8">
            {/* 核心功能展示 */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="glass-modern-soft border-gradient relative rounded-2xl p-4 transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 text-white">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    D1 Database
                  </h3>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  Cloudflare D1
                  分布式数据库，存储上传记录和用户数据，支持复杂的查询和聚合操作。
                </p>
              </div>

              <div className="glass-modern-soft border-gradient relative rounded-2xl p-4 transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 text-white">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">KV Cache</h3>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  Cloudflare KV
                  键值存储，缓存GitHub用户信息，提升响应速度和用户体验。
                </p>
              </div>

              <div className="glass-modern-soft border-gradient relative rounded-2xl p-4 transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-white">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    AI Moderation
                  </h3>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  基于Cloudflare
                  AI的内容审核，智能识别和过滤不当内容，确保平台安全。
                </p>
              </div>

              <div className="glass-modern-soft border-gradient relative rounded-2xl p-4 transition-transform hover:-translate-y-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-orange-500/20 to-red-500/20 text-white">
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                      />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-white">
                    IP Blacklist
                  </h3>
                </div>
                <p className="text-sm text-white/70 leading-relaxed">
                  智能IP黑名单系统，基于Durable
                  Objects实现，自动封禁恶意访问者。
                </p>
              </div>
            </div>

            {/* Tech Stack */}
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              <span className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                Cloudflare Workers
              </span>
              <span className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                R2 Storage
              </span>
              <span className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                D1 Database
              </span>
              <span className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                KV Cache
              </span>
              <span className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                AI Moderation
              </span>
              <span className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                Durable Objects
              </span>
              <span className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                Next.js 14
              </span>
              <span className="px-2 sm:px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                TypeScript
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center justify-center space-x-4 sm:space-x-6">
              <a
                href="https://github.com/KaikiDeishuuu/PicoPics"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-all hover:scale-110"
                title="GitHub"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                </svg>
              </a>
              <a
                href="https://t.me/OnonokiiBOT"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-all hover:scale-110"
                title="Telegram"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </a>
              <a
                href="https://lambdax.me"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-all hover:scale-110"
                title="Blog"
              >
                <svg
                  className="w-5 h-5 sm:w-6 sm:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
                  />
                </svg>
              </a>
            </div>

            {/* Copyright */}
            <div className="space-y-2">
              <p className="text-white/70 text-sm">
                © {new Date().getFullYear()}{" "}
                <span className="font-semibold text-white">Kaiki</span>. All
                rights reserved.
              </p>
              <p className="text-white/50 text-xs">
                Powered by Cloudflare Edge Network
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
