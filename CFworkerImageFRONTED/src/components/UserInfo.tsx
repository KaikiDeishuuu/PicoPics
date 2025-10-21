/**
 * 用户信息组件
 */

"use client";

import { motion } from "framer-motion";
import { clearAuth, type GitHubUser } from "@/services/auth";

interface UserInfoProps {
  user: GitHubUser;
  onLogout: () => void;
}

export default function UserInfo({ user, onLogout }: UserInfoProps) {
  const handleLogout = () => {
    clearAuth();
    onLogout();
  };

  return (
    <motion.div
      className="glass-modern border-gradient relative rounded-2xl p-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-500 to-red-500 blur-lg opacity-40" />
            <img
              src={user.avatar_url}
              alt={user.name || user.login}
              className="relative z-10 h-12 w-12 rounded-full border border-white/20"
            />
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
        <button
          onClick={handleLogout}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-white/80 transition hover:border-red-400/40 hover:bg-red-500/20 hover:text-red-100"
        >
          退出登录
        </button>
      </div>
    </motion.div>
  );
}
