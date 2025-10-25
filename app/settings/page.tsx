"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/ui/footer";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LoadingSpinner } from "@/components/ui/loading";
import { ArrowLeft, Settings, Bell, BellOff, Save, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface UserSettings {
  telegramChatId: string | null;
  notificationEnabled: boolean;
}

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<UserSettings>({
    telegramChatId: null,
    notificationEnabled: false,
  });
  const [telegramIdInput, setTelegramIdInput] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("auth");
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        if (auth.user && auth.accessToken) {
          setUser(auth.user);
          fetchUserSettings(auth.accessToken);
        } else {
          alert("Please login to access settings");
          router.push("/");
        }
      } catch (error) {
        console.error("Failed to parse auth data:", error);
        router.push("/");
      }
    } else {
      router.push("/");
    }
  }, [router]);

  const fetchUserSettings = async (accessToken: string) => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_UPLOAD_API ||
          "https://uploader-worker-v2-prod.haoweiw370.workers.dev"
        }/api/user/settings`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setSettings(data.data);
          setTelegramIdInput(data.data.telegramChatId || "");
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const authData = localStorage.getItem("auth");
      if (!authData) return;

      const auth = JSON.parse(authData);
      const accessToken = auth.accessToken;

      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_UPLOAD_API ||
          "https://uploader-worker-v2-prod.haoweiw370.workers.dev"
        }/api/user/settings`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            telegramChatId: telegramIdInput || null,
            notificationEnabled: settings.notificationEnabled,
          }),
        }
      );

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert("设置已保存！");
          setSettings({
            telegramChatId: telegramIdInput || null,
            notificationEnabled: settings.notificationEnabled,
          });
        }
      } else {
        alert("保存失败，请重试");
      }
    } catch (error) {
      console.error("Failed to save settings:", error);
      alert("保存失败，请重试");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-screen">
          <LoadingSpinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="relative z-10 container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center space-x-2 text-gray-800 dark:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>返回首页</span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="card-modern border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl md:text-3xl flex items-center space-x-2 text-white">
                <Settings className="h-6 w-6" />
                <span>设置</span>
              </CardTitle>
              <CardDescription className="text-white/70">
                管理您的通知偏好
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Telegram Notification Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span className="font-medium text-white">
                      Telegram 通知
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        notificationEnabled: !settings.notificationEnabled,
                      })
                    }
                    className="flex items-center space-x-2"
                  >
                    {settings.notificationEnabled ? (
                      <>
                        <Bell className="h-4 w-4" />
                        <span>已启用</span>
                      </>
                    ) : (
                      <>
                        <BellOff className="h-4 w-4" />
                        <span>已禁用</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/80">
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={telegramIdInput}
                    onChange={(e) => setTelegramIdInput(e.target.value)}
                    placeholder="输入您的 Telegram Chat ID"
                    className="w-full px-4 py-2 rounded-lg border border-white/20 bg-black/40 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={!settings.notificationEnabled}
                  />
                  <p className="text-xs text-white/60">
                    如何获取 Chat ID: 在 Telegram 搜索{" "}
                    <span className="font-mono text-white/80">
                      @userinfobot
                    </span>{" "}
                    并发送 /start
                  </p>
                </div>
              </div>

              {/* Save Button */}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full"
                size="lg"
              >
                {saving ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    保存中...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    保存设置
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
