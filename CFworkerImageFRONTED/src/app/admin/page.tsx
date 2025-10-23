"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getAuth, checkAdminStatus, type GitHubUser } from "@/services/auth";
import R2Browser from "@/components/R2Browser";
import AdminPanel from "@/components/AdminPanel";

export default function AdminPage() {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminToken, setAdminToken] = useState<string>("");
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [storedAdminToken, setStoredAdminToken] = useState<string>("");
  const router = useRouter();

  const checkAdminAccess = useCallback(
    async (token?: string) => {
      const auth = getAuth();
      if (!auth) {
        router.push("/");
        return;
      }

      try {
        const isAdmin = await checkAdminStatus(auth.accessToken, token);
        if (isAdmin) {
          setUser(auth.user);
          setStoredAdminToken(token || "");
          setLoading(false);
          setShowTokenInput(false);
        } else {
          if (token) {
            // Token provided but invalid
            alert("管理员令牌无效");
          } else {
            // First check, show token input
            setShowTokenInput(true);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error("Admin check failed:", error);
        router.push("/");
      }
    },
    [router]
  );

  useEffect(() => {
    checkAdminAccess();
  }, [checkAdminAccess]);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminToken.trim()) {
      checkAdminAccess(adminToken.trim());
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (showTokenInput) {
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
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:120px_120px] opacity-20" />
        </div>

        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="max-w-6xl w-full">
            <div className="glass-modern border-gradient relative rounded-2xl p-6 md:p-8">
              <div className="text-center mb-6">
                <div className="grid h-12 w-12 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-600 text-white font-bold text-xl shadow-lg shadow-red-500/40 mx-auto mb-4">
                  A
                </div>
                <h2 className="text-xl font-bold text-white mb-2">
                  管理员验证
                </h2>
                <p className="text-white/60 text-sm mb-4">
                  请输入管理员访问令牌
                </p>

                {/* 管理员令牌提示 */}
                <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3 mb-4 max-w-md mx-auto">
                  <div className="flex items-start space-x-2">
                    <svg
                      className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div className="text-left">
                      <p className="text-blue-300 text-xs font-medium mb-1">
                        如何获取管理员令牌？
                      </p>
                      <p className="text-blue-200/80 text-xs">
                        管理员令牌通过 Cloudflare Workers secret
                        设置。如需查看或修改，请运行：
                      </p>
                      <code className="block bg-black/30 text-blue-300 text-xs p-2 rounded mt-2 font-mono">
                        npx wrangler secret put ADMIN_TOKEN --env production
                      </code>
                    </div>
                  </div>
                </div>
              </div>

              <form
                onSubmit={handleTokenSubmit}
                className="max-w-md mx-auto space-y-4"
              >
                <div>
                  <input
                    type="password"
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    placeholder="输入管理员令牌"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-medium rounded-lg transition-all duration-200"
                >
                  验证令牌
                </button>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => router.push("/")}
                  className="text-white/60 hover:text-white text-sm transition-colors"
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

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
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.08),transparent_45%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:120px_120px] opacity-20" />
      </div>

      {/* 头部 */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 shadow-[0_18px_35px_rgba(10,10,25,0.45)]">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="grid h-10 w-10 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-red-500 via-orange-500 to-yellow-600 text-white font-bold text-xl shadow-lg shadow-red-500/40">
                A
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white drop-shadow-lg">
                  Admin Panel
                </h1>
                <p className="text-white/70 text-sm">R2 Storage Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {/* 在线状态指示器 */}
              <div className="hidden sm:flex items-center space-x-2">
                <span className="flex items-center space-x-2 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 shadow-lg shadow-emerald-500/30">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                  <span>Online</span>
                </span>
              </div>

              {/* 返回首页按钮 */}
              <button
                onClick={() => router.push("/")}
                className="inline-flex items-center space-x-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white"
                title="返回首页"
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
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span className="hidden md:inline">返回首页</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主内容区 */}
      <main className="max-w-6xl mx-auto px-4 py-8 relative z-10">
        <div className="space-y-8">
          {/* 欢迎信息 */}
          <div className="glass-modern border-gradient relative rounded-2xl p-6 md:p-8 w-full">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-4">
                  欢迎回来，管理员 {user.name || user.login}
                </h2>
                <p className="text-white/70">
                  这里是R2存储管理和用户数据管理后台。您可以浏览、删除和管理所有存储的文件。
                </p>
              </div>
              <div className="md:flex-shrink-0">
                <div className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-lg border border-white/20 bg-gradient-to-br from-red-500/20 to-orange-500/20 text-white">
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
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">管理员权限</p>
                    <p className="text-xs text-white/60">完全访问权限</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* R2浏览器功能区 */}
          <div className="glass-modern border-gradient relative rounded-2xl p-6 md:p-8 w-full">
            <h3 className="text-xl font-semibold text-white mb-6">
              R2 存储浏览器
            </h3>

            <R2Browser adminToken={storedAdminToken} />
          </div>

          {/* 用户数据管理 */}
          <div className="glass-modern border-gradient relative rounded-2xl p-6 md:p-8 w-full">
            <h3 className="text-xl font-semibold text-white mb-6">
              用户数据管理
            </h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="glass-modern-soft border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
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
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-white">
                    数据库统计
                  </h4>
                </div>
                <p className="text-white/60 text-sm">
                  查看用户上传记录、存储使用情况等统计信息
                </p>
              </div>

              <div className="glass-modern-soft border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
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
                        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-white">用户管理</h4>
                </div>
                <p className="text-white/60 text-sm">
                  管理用户账户、权限设置等
                </p>
              </div>

              <div className="glass-modern-soft border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
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
                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                      />
                    </svg>
                  </div>
                  <h4 className="text-lg font-semibold text-white">系统设置</h4>
                </div>
                <p className="text-white/60 text-sm">
                  配置系统参数、安全策略等
                </p>
              </div>
            </div>
            <div className="mt-6">
              <AdminPanel adminToken={storedAdminToken} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
