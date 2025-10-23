"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { clearAuth, type GitHubUser } from "../services/auth";

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
      className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-2xl w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">
            User Profile
          </span>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Image
                src={user.avatar_url}
                alt={user.login}
                width={48}
                height={48}
                className="h-12 w-12 rounded-xl border border-white/10"
              />
              <div>
                <h3 className="text-xl font-semibold text-white">
                  {user.name || user.login}
                </h3>
                <p className="text-sm text-white/60">@{user.login}</p>
              </div>
            </div>
            <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/80">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.301 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.011-1.04-.017-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.238 1.84 1.238 1.07 1.835 2.807 1.305 3.492.998.107-.775.418-1.305.762-1.604-2.665-.303-5.467-1.335-5.467-5.93 0-1.31.469-2.381 1.236-3.22-.124-.304-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.51 11.51 0 013-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.872.118 3.176.77.839 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.921.43.371.823 1.102.823 2.222 0 1.604-.015 2.896-.015 3.286 0 .319.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleLogout}
            className="flex-1 rounded-xl border border-white/10 bg-black/40 px-6 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black"
          >
            退出登录
          </button>
          <a
            href={`https://github.com/${user.login}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-orange-500/30 transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black text-center"
          >
            查看 GitHub
          </a>
        </div>

        <div className="rounded-xl border border-white/10 bg-black/40 p-4 text-sm text-white/60">
          <p>
            您现在可以上传图片到您的专属图床。所有图片都会与您的 GitHub
            账户关联。
          </p>
        </div>
      </div>
    </motion.div>
  );
}
