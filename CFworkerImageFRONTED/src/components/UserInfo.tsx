/**
 * 用户信息组件
 */

"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { clearAuth, getAuth, type GitHubUser } from "@/services/auth";

interface UserInfoProps {
  user: GitHubUser;
  onLogout: () => void;
}

export default function UserInfo({ user, onLogout }: UserInfoProps) {
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const auth = getAuth();
    if (auth) {
      // 简化admin检查，只检查用户名是否在预定义列表中
      // 真正的权限验证在admin页面进行
      const adminUsernames = ["KaikiDeishuuu"]; // 管理员用户名列表
      setIsAdminUser(adminUsernames.includes(auth.user.login));
    }
  }, []);

  const handleLogout = () => {
    clearAuth();
    onLogout();
  };

  return (
    <motion.div
      className="glass-modern border-gradient relative rounded-2xl p-5 md:p-6 w-full"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 to-red-500 blur-lg opacity-40" />
            <div className="relative z-10 h-12 w-12 rounded-full overflow-hidden border border-white/20">
              <Image
                src={user.avatar_url}
                alt={user.name || user.login}
                fill
                sizes="48px"
                className="object-cover"
              />
            </div>
          </div>
          <div>
            <p className="text-base font-semibold text-white">
              {user.name || user.login}
            </p>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              @{user.login}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
          {isAdminUser && (
            <a
              href="/admin"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-orange-400/40 bg-gradient-to-r from-orange-500/20 to-red-500/20 px-3 py-2 text-sm font-medium text-orange-200 transition-all hover:border-orange-400/60 hover:bg-orange-500/30 hover:text-orange-100 hover:shadow-lg hover:shadow-orange-500/20 w-full sm:w-auto"
            >
              <svg
                className="w-4 h-4 flex-shrink-0"
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
              <span className="hidden xs:inline">管理后台</span>
            </a>
          )}
          <button
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-white/80 transition-all hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-100 hover:shadow-lg hover:shadow-red-500/20 w-full sm:w-auto"
          >
            <svg
              className="w-4 h-4 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="hidden xs:inline">退出登录</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}
