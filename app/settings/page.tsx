"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Bell, BellOff, Check, Save, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Footer } from "@/components/ui/footer";
import { LoadingSpinner } from "@/components/ui/loading";

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
          "https://your-upload-worker.workers.dev"
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
          "https://your-upload-worker.workers.dev"
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
              <CardTitle className="text-2xl md:text-3xl flex items-center space-x-2 text-foreground">
                <Settings className="h-6 w-6 text-primary" />
                <span>Settings</span>
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                管理您的通知偏好
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Telegram Notification Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span className="font-medium text-foreground">
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
                  <label className="text-sm font-medium text-foreground">
                    Telegram Chat ID
                  </label>
                  <input
                    type="text"
                    value={telegramIdInput}
                    onChange={(e) => setTelegramIdInput(e.target.value)}
                    placeholder="输入您的 Telegram Chat ID"
                    className="w-full px-4 py-2 rounded-lg border border-border bg-background text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    disabled={!settings.notificationEnabled}
                  />
                  <p className="text-xs text-muted-foreground">
                    如何获取 Chat ID: 在 Telegram 搜索{" "}
                    <span className="font-mono text-foreground">
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
