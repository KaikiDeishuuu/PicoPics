/**
 * GitHub 登录按钮组件
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  initiateGitHubAuth,
  pollGitHubAuth,
  getGitHubUser,
  saveAuth,
  type GitHubUser,
} from "@/services/auth";

interface GitHubLoginProps {
  onSuccess: (user: GitHubUser, token: string) => void;
  onError: (error: string) => void;
}

export default function GitHubLogin({ onSuccess, onError }: GitHubLoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [userCode, setUserCode] = useState<string | null>(null);
  const [verificationUri, setVerificationUri] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setUserCode(null);
    setVerificationUri(null);

    try {
      // 1. 启动 Device Flow
      const { deviceCode, userCode, verificationUri, expiresIn, interval } =
        await initiateGitHubAuth();

      setUserCode(userCode);
      setVerificationUri(verificationUri);

      // 2. 轮询检查授权
      const maxAttempts = Math.floor(expiresIn / interval);
      let attempts = 0;

      const poll = async (): Promise<void> => {
        if (attempts >= maxAttempts) {
          throw new Error("授权超时，请重试");
        }

        attempts++;

        try {
          const accessToken = await pollGitHubAuth(deviceCode);

          // 3. 获取用户信息
          const user = await getGitHubUser(accessToken);

          // 4. 保存认证信息
          saveAuth({
            accessToken,
            user,
            expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30天
          });

          setUserCode(null);
          setVerificationUri(null);
          setIsLoading(false);
          onSuccess(user, accessToken);
        } catch (error) {
          if (
            error instanceof Error &&
            (error.message === "PENDING" || error.message === "SLOW_DOWN")
          ) {
            // 继续轮询
            setTimeout(poll, interval * 1000);
          } else {
            throw error;
          }
        }
      };

      // 开始轮询
      setTimeout(poll, interval * 1000);
    } catch (error) {
      setIsLoading(false);
      setUserCode(null);
      setVerificationUri(null);
      onError(error instanceof Error ? error.message : "登录失败");
    }
  };

  return (
    <motion.div
      className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8 shadow-2xl w-full"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
    >
      {!userCode ? (
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">
              Authentication
            </span>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-2xl font-semibold text-white">
                  使用 GitHub 登录
                </h3>
                <p className="text-sm text-white/60">
                  授权后方可上传图片，确保专属使用
                </p>
              </div>
              <div className="hidden sm:flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/10 text-white/80">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.301 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.011-1.04-.017-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.238 1.84 1.238 1.07 1.835 2.807 1.305 3.492.998.107-.775.418-1.305.762-1.604-2.665-.303-5.467-1.335-5.467-5.93 0-1.31.469-2.381 1.236-3.22-.124-.304-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.51 11.51 0 013-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.872.118 3.176.77.839 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.921.43.371.823 1.102.823 2.222 0 1.604-.015 2.896-.015 3.286 0 .319.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12z" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogin}
            disabled={isLoading}
            className="w-full rounded-xl bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-orange-500/30 transition focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2 focus:ring-offset-black disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center justify-center gap-3">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.301 3.438 9.8 8.205 11.387.6.111.82-.261.82-.577 0-.285-.011-1.04-.017-2.04-3.338.726-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.84 1.238 1.84 1.238 1.07 1.835 2.807 1.305 3.492.998.107-.775.418-1.305.762-1.604-2.665-.303-5.467-1.335-5.467-5.93 0-1.31.469-2.381 1.236-3.22-.124-.304-.536-1.523.117-3.176 0 0 1.008-.322 3.3 1.23a11.51 11.51 0 013-.404c1.02.005 2.047.138 3.003.404 2.29-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.872.118 3.176.77.839 1.235 1.91 1.235 3.22 0 4.61-2.807 5.624-5.48 5.921.43.371.823 1.102.823 2.222 0 1.604-.015 2.896-.015 3.286 0 .319.218.694.825.576C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12z" />
              </svg>
              <span>
                {isLoading ? "正在连接 GitHub..." : "使用 GitHub 登录"}
              </span>
            </span>
          </button>

          <div className="rounded-xl border border-white/10 bg-black/40 p-3 text-sm text-white/60">
            <p>
              登录过程采用 GitHub Device
              Flow，确保访问令牌仅保存在本地浏览器。授权有效期为
              <span className="mx-1 font-medium text-white/80">30 天</span>。
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium uppercase tracking-[0.35em] text-white/50">
              Verification
            </span>
            <h3 className="text-2xl font-semibold text-white">
              完成 GitHub 授权
            </h3>
            <p className="text-sm text-white/60">
              请按照以下步骤完成授权。若超过 15
              分钟未操作，将需要重新获取验证码。
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-black/40 p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              用户代码
            </p>
            <p className="mt-3 font-mono text-3xl tracking-[0.4em] text-white">
              {userCode}
            </p>
            <a
              href={verificationUri || "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-lg border border-orange-400/40 px-4 py-2 text-sm font-medium text-orange-100 transition hover:bg-orange-500/10"
            >
              打开 GitHub 授权页面
            </a>
          </div>

          <div className="grid gap-3 text-sm text-white/70 md:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="font-medium text-white">步骤 1</p>
              <p className="mt-2">点击上方按钮进入 GitHub 授权页面。</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/30 p-4">
              <p className="font-medium text-white">步骤 2</p>
              <p className="mt-2">
                输入用户代码并确认授权，返回本站自动完成登录。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-white/70">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-orange-400"></div>
            <span>等待授权完成，请勿关闭当前页面。</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
