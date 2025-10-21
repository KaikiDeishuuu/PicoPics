/**
 * 主页面
 * 图片上传界面
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import UploadZone from "@/components/UploadZone";
import ResultDisplay from "@/components/ResultDisplay";
import GitHubLogin from "@/components/GitHubLogin";
import UserInfo from "@/components/UserInfo";
import { getAuth, type GitHubUser } from "@/services/auth";
import type { UploadSuccessResponse } from "@/types";

const HISTORY_STORAGE_KEY = "upload_history";

export default function Home() {
  const [uploadResult, setUploadResult] =
    useState<UploadSuccessResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [uploadHistory, setUploadHistory] = useState<UploadSuccessResponse[]>(
    []
  );
  const [currentUser, setCurrentUser] = useState<GitHubUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Load auth and history from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      // Load auth
      const auth = getAuth();
      if (auth) {
        setCurrentUser(auth.user);
        setAccessToken(auth.accessToken);
      }

      // Load history
      try {
        const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          setUploadHistory(parsed);
        }
      } catch (e) {
        console.error("Failed to load upload history:", e);
      }
    }
  }, []);

  // Save history to localStorage whenever it changes
  useEffect(() => {
    if (typeof window !== "undefined" && uploadHistory.length > 0) {
      try {
        localStorage.setItem(
          HISTORY_STORAGE_KEY,
          JSON.stringify(uploadHistory)
        );
      } catch (e) {
        console.error("Failed to save upload history:", e);
      }
    }
  }, [uploadHistory]);

  const handleUploadSuccess = (data: UploadSuccessResponse) => {
    setUploadResult(data);
    setErrorMessage("");
    // Add to history
    setUploadHistory((prev) => [data, ...prev].slice(0, 10)); // Keep last 10
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
        <div className="absolute inset-0 bg-gradient-aurora" />
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
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/30 backdrop-blur-2xl shadow-[0_18px_35px_rgba(10,10,25,0.45)]">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-orange-500 via-rose-500 to-purple-600 text-white font-bold text-xl shadow-lg shadow-orange-500/40">
                K
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                  Kaiki Image
                </h1>
                <p className="text-white/70 text-sm">
                  Cloudflare R2 + AI Powered
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center space-x-3">
              <span className="flex items-center space-x-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 shadow-lg shadow-emerald-500/30">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                <span>Online</span>
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-7xl mx-auto px-4 py-8 relative z-10">
        {/* Error message */}
        {errorMessage && (
          <div className="mb-6 backdrop-blur-xl bg-red-600/30 border border-red-500/50 rounded-xl p-4 shadow-2xl animate-shake">
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column - Upload */}
          <div className="space-y-6 lg:col-span-2">
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
              <div className="relative overflow-hidden rounded-2xl border-gradient p-8 text-center text-white/80 glass-modern-soft">
                <div className="absolute inset-0 opacity-40">
                  <div className="animate-orb absolute -top-24 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-gradient-to-br from-cyan-400/35 to-blue-500/25 blur-2xl" />
                </div>
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
                <h3 className="relative mb-2 text-lg font-semibold text-white">
                  需要登录
                </h3>
                <p className="relative text-sm text-white/70">
                  请使用 GitHub 账号登录后上传图片
                </p>
              </div>
            )}
          </div>

          {/* Right Column - History */}
          <div className="lg:col-span-1">
            {uploadHistory.length > 0 && (
              <div className="sticky top-4 max-h-[calc(100vh-6rem)] overflow-y-auto">
                <div className="glass-modern-soft border-gradient relative rounded-2xl p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-white">
                      Upload History ({uploadHistory.length})
                    </h2>
                    <button
                      onClick={() => {
                        setUploadHistory([]);
                        if (typeof window !== "undefined") {
                          localStorage.removeItem(HISTORY_STORAGE_KEY);
                        }
                      }}
                      className="rounded px-3 py-1 text-xs text-white/60 transition-colors hover:bg-red-500/20 hover:text-red-200"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="space-y-3">
                    {uploadHistory.map((item, index) => (
                      <div
                        key={index}
                        className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/10 p-[1px] transition-all hover:border-white/30 hover:shadow-[0_15px_35px_rgba(15,23,42,0.55)]"
                        onClick={() => setUploadResult(item)}
                      >
                        <div className="flex gap-3 rounded-xl bg-black/40 p-3">
                          {/* Image Preview */}
                          <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-black/60">
                            <img
                              src={item.url}
                              alt={item.fileName}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div
                              className="truncate text-xs font-medium text-white/80"
                              title={item.fileName}
                            >
                              {item.fileName}
                            </div>
                            <div className="mt-1 text-xs text-white/60">
                              {(item.size / 1024).toFixed(1)} KB
                            </div>
                            <div className="mt-1 text-xs text-white/40">
                              {new Date(item.uploadedAt).toLocaleString()}
                            </div>
                          </div>
                          {/* Action Icon */}
                          <div className="flex-shrink-0 flex items-center">
                            <svg
                              className="h-5 w-5 text-white/40 transition-colors group-hover:text-cyan-300"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 使用说明 */}
        <div className="glass-modern-soft border-gradient relative mt-12 rounded-2xl p-6 transition-transform hover:-translate-y-1">
          <h2 className="mb-4 text-xl font-semibold text-white">How to Use</h2>
          <div className="grid gap-4 text-sm md:grid-cols-3">
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
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="glass-modern-soft border-gradient relative rounded-2xl p-5 transition-transform hover:-translate-y-1">
            <h3 className="mb-2 text-lg font-semibold text-white">Fast</h3>
            <p className="text-sm text-white/70">
              Cloudflare global CDN network
            </p>
          </div>
          <div className="glass-modern-soft border-gradient relative rounded-2xl p-5 transition-transform hover:-translate-y-1">
            <h3 className="mb-2 text-lg font-semibold text-white">Secure</h3>
            <p className="text-sm text-white/70">
              Enterprise storage with daily quota
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-16 py-8 backdrop-blur-md bg-white/5 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center space-y-6">
            {/* Tech Stack */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                Cloudflare Workers
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                R2 Storage
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                AI Moderation
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                Next.js 14
              </span>
              <span className="px-3 py-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-white/90 text-xs font-medium">
                TypeScript
              </span>
            </div>

            {/* Links */}
            <div className="flex items-center justify-center space-x-6">
              <a
                href="https://github.com/KaikiDeishuuu"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-2 text-white/80 hover:text-white transition-all hover:scale-110"
                title="GitHub"
              >
                <svg
                  className="w-6 h-6"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
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
                  className="w-6 h-6"
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
