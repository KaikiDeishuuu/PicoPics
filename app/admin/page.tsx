"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  CheckCircle,
  Clock,
  Database,
  Download,
  Globe,
  HardDrive,
  Image,
  PieChart,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AnimatedDiv,
  cardHoverVariants,
  listItemVariants,
  pageTransition,
  pageVariants,
  pulseVariants,
  StaggerContainer,
} from "@/components/ui/animations";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicBackground } from "@/components/ui/dynamic-background";
import { Footer } from "@/components/ui/footer";
import { IPManagement } from "@/components/ui/ip-management";
import { LoadingSpinner } from "@/components/ui/loading";
import { NotificationContainer, useNotifications } from "@/components/ui/notification";
import { SystemMonitor } from "@/components/ui/system-monitor";

// 强制动态渲染
export const dynamic = "force-dynamic";

interface User {
  id: number;
  login: string;
  name?: string;
  email?: string;
  avatar_url?: string;
}

interface AdminStats {
  totalUsers: number;
  totalImages: number;
  totalSize: string;
  todayUploads: number;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  uploads: number;
  lastActive: string;
}

function AdminContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminToken, setAdminToken] = useState<string>("");
  const [tokenInput, setTokenInput] = useState<string>("");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "users" | "analytics" | "ip-management" | "system-monitor" | "data-management"
  >("overview");
  const [images, setImages] = useState<any[]>([]);
  const { notifications, addNotification, removeNotification } = useNotifications();

  // 认证检查
  useEffect(() => {
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("auth");
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        if (auth.user && auth.accessToken) {
          setIsAuthenticated(true);
          setUser(auth.user);
          setAccessToken(auth.accessToken);
        }
      } catch (error) {
        console.error("Failed to parse auth data:", error);
        localStorage.removeItem("auth");
      }
    }
  }, []);

  // 检查管理员权限
  useEffect(() => {
    if (!isAuthenticated || !accessToken || !adminToken) return;

    const checkAdminAccess = async () => {
      try {
        const adminApi =
          process.env.NEXT_PUBLIC_UPLOAD_API ||
          "https://uploader-worker-v2-prod.haoweiw370.workers.dev";

        const response = await fetch(`${adminApi}/api/admin/stats`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Admin-Token": adminToken,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log("Admin access check - stats data:", data);
          setIsAdmin(true);
          setStats(data);
          setError(null);
          // Fetch users data
          fetchUsers();
        } else {
          setIsAdmin(false);
          setError("无管理员权限");
        }
      } catch (err) {
        console.error("Admin access check error:", err);
        setIsAdmin(false);
        setError("检查管理员权限失败");
      }
    };

    checkAdminAccess();
  }, [isAuthenticated, accessToken, adminToken]);

  // 处理token输入
  const handleTokenSubmit = async () => {
    if (!tokenInput.trim()) {
      setError("请输入管理员令牌");
      return;
    }

    // 设置token
    const token = tokenInput.trim();
    setAdminToken(token);
    setError(null);
    setLoading(true);

    // 立即验证token
    try {
      const adminApi =
        process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev";

      const response = await fetch(`${adminApi}/api/admin/stats`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Admin-Token": token,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setIsAdmin(true);
        setError(null);
        // Fetch users data
        fetchUsers();
      } else {
        setError("管理员令牌无效");
        setIsAdmin(false);
      }
    } catch (err) {
      console.error("Token verification error:", err);
      setError("验证失败，请重试");
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  // 获取统计数据
  const fetchStats = async () => {
    if (!accessToken || !adminToken) return;

    try {
      setLoading(true);
      const adminApi =
        process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev";

      console.log("Admin API URL:", adminApi);
      console.log("Access Token:", accessToken ? "Present" : "Missing");
      console.log("Admin Token:", adminToken ? "Present" : "Missing");

      const response = await fetch(`${adminApi}/api/admin/stats`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Admin-Token": adminToken,
          "Content-Type": "application/json",
        },
      });

      console.log("Admin stats response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Admin stats data:", data);
        setStats(data);
        setError(null);
      } else {
        const errorText = await response.text();
        console.error("Admin stats error:", errorText);
        setError("获取统计数据失败");
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
      setError("获取统计数据失败");
    } finally {
      setLoading(false);
    }
  };

  // 获取用户列表
  const fetchUsers = async () => {
    const token = adminToken || "";
    if (!accessToken || !token) {
      console.log("Missing tokens for fetchUsers:", {
        accessToken,
        adminToken,
      });
      return;
    }

    try {
      console.log("Fetching users with admin token...");
      const adminApi =
        process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev";

      const response = await fetch(`${adminApi}/api/admin/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Admin-Token": token,
          "Content-Type": "application/json",
        },
      });

      console.log("Users API response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Users API response data:", data);
        setUsers(Array.isArray(data.data) ? data.data : []);
        setError(null);
      } else {
        const errorText = await response.text();
        console.error("Users API error:", errorText);
        setError("获取用户列表失败");
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("获取用户列表失败");
    }
  };

  // 获取图片列表
  const fetchImages = async () => {
    const token = adminToken || "";
    if (!accessToken || !token) return;

    try {
      const adminApi =
        process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev";

      const response = await fetch(`${adminApi}/api/admin/images`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Admin-Token": token,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setImages(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Fetch images error:", err);
    }
  };

  // 删除图片
  const handleDeleteImage = async (key: string) => {
    if (!confirm("确定要删除这张图片吗？此操作不可恢复。")) return;

    const token = adminToken || "";
    if (!accessToken || !token) return;

    try {
      const adminApi =
        process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev";

      const response = await fetch(`${adminApi}/api/admin/images/${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "X-Admin-Token": token,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        addNotification({
          type: "success",
          title: "删除成功",
          message: "图片已删除",
          duration: 3000,
        });
        // 刷新图片列表
        fetchImages();
      } else {
        addNotification({
          type: "error",
          title: "删除失败",
          message: "无法删除图片",
          duration: 3000,
        });
      }
    } catch (err) {
      console.error("Delete image error:", err);
      addNotification({
        type: "error",
        title: "删除失败",
        message: "删除图片时出错",
        duration: 3000,
      });
    }
  };

  // 刷新数据
  const handleRefresh = () => {
    fetchStats();
    fetchUsers();
    if (activeTab === "data-management") {
      fetchImages();
    }
    addNotification({
      type: "info",
      title: "正在刷新",
      message: "正在更新管理员数据",
      duration: 2000,
    });
  };

  // 如果没有认证，重定向到首页
  if (!isAuthenticated) {
    return (
      <DynamicBackground variant="sunset" intensity="medium" speed="slow" className="min-h-screen">
        <motion.div
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          className="min-h-screen flex items-center justify-center"
        >
          <Card className="w-full max-w-md mx-4 card-modern">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">需要登录</CardTitle>
              <CardDescription>请先登录以访问管理员面板</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/">
                <Button className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  返回首页
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </DynamicBackground>
    );
  }

  // 如果没有管理员权限
  if (!isAdmin) {
    return (
      <DynamicBackground variant="sunset" intensity="medium" speed="slow" className="min-h-screen">
        <motion.div
          initial="initial"
          animate="in"
          exit="out"
          variants={pageVariants}
          transition={pageTransition}
          className="min-h-screen flex items-center justify-center"
        >
          <Card className="w-full max-w-md mx-4 card-modern">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Shield className="h-12 w-12 text-blue-400" />
              </div>
              <CardTitle className="text-2xl text-white">Admin Authentication</CardTitle>
              <CardDescription className="text-white/80">
                Please enter admin token to access admin panel
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Admin Token</label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="Enter admin token"
                  className="w-full px-3 py-2 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/60 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      handleTokenSubmit();
                    }
                  }}
                />
              </div>
              {error && <div className="text-red-400 text-sm text-center">{error}</div>}
              <Button
                onClick={handleTokenSubmit}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                disabled={!tokenInput.trim() || loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner className="mr-2" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Verify Token
                  </>
                )}
              </Button>
              <Link href="/">
                <Button className="w-full bg-black/80 text-white border-white/20 hover:bg-white/10">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </DynamicBackground>
    );
  }

  return (
    <DynamicBackground variant="sunset" intensity="medium" speed="slow" className="min-h-screen">
      <motion.div
        initial="initial"
        animate="in"
        exit="out"
        variants={pageVariants}
        transition={pageTransition}
        className="container mx-auto px-4 py-8"
      >
        {/* 头部导航 - 单行布局 */}
        <header className="flex items-center justify-between px-4 py-3 bg-black/70 backdrop-blur-md border border-white/20 rounded-xl mb-8">
          <Link href="/">
            <button className="text-white/80 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <h1 className="text-white font-semibold text-base sm:text-lg flex items-center space-x-2">
            <Shield className="h-5 w-5 text-blue-400" />
            <span>Admin Panel</span>
          </h1>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded transition-colors disabled:opacity-50 flex items-center space-x-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </header>

        {/* 欢迎信息 */}
        <Card className="card-modern mb-8">
          <CardContent className="py-3 px-4">
            <p className="text-white/80 text-sm">
              Welcome back, {user?.login}! System administration console
            </p>
          </CardContent>
        </Card>

        {/* 标签页导航 */}
        <motion.div variants={cardHoverVariants} initial="rest" whileHover="hover" className="mb-8">
          <Card className="card-modern">
            <CardContent className="p-4">
              <div className="flex overflow-x-auto space-x-1 scrollbar-hide">
                {[
                  { id: "overview", label: "概览", icon: BarChart3 },
                  { id: "users", label: "用户管理", icon: Users },
                  { id: "data-management", label: "数据管理", icon: Database },
                  { id: "analytics", label: "数据分析", icon: PieChart },
                  { id: "ip-management", label: "IP管理", icon: Shield },
                  { id: "system-monitor", label: "系统监控", icon: Activity },
                ].map((tab) => (
                  <Button
                    key={tab.id}
                    variant={activeTab === tab.id ? "default" : "ghost"}
                    onClick={() => {
                      setActiveTab(
                        tab.id as
                          | "overview"
                          | "users"
                          | "analytics"
                          | "ip-management"
                          | "system-monitor"
                          | "data-management"
                      );
                      if (tab.id === "data-management") {
                        fetchImages();
                      }
                    }}
                    className={`flex items-center space-x-1 sm:space-x-2 whitespace-nowrap ${
                      activeTab === tab.id
                        ? "bg-blue-600 text-white"
                        : "text-white/80 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <tab.icon className="h-4 w-4" />
                    <span className="text-xs sm:text-sm">{tab.label}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* 内容区域 */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <StaggerContainer className="mb-8">
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                    {
                      title: "总用户数",
                      value: stats?.totalUsers || 0,
                      icon: Users,
                      color: "from-blue-400 to-blue-600",
                      change: "+12%",
                    },
                    {
                      title: "总图片数",
                      value: stats?.totalImages || 0,
                      icon: Image,
                      color: "from-green-400 to-green-600",
                      change: "+8%",
                    },
                    {
                      title: "存储使用",
                      value: stats?.totalSize || "0 MB",
                      icon: HardDrive,
                      color: "from-orange-400 to-orange-600",
                      change: "+5%",
                    },
                    {
                      title: "今日上传",
                      value: stats?.todayUploads || 0,
                      icon: TrendingUp,
                      color: "from-purple-400 to-purple-600",
                      change: "+15%",
                    },
                  ].map((stat, index) => (
                    <motion.div key={index} variants={listItemVariants} custom={index}>
                      <Card className="card-modern hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium text-white/70">{stat.title}</p>
                              <p className="text-2xl font-bold text-white">{stat.value}</p>
                              <p className="text-xs text-green-400">{stat.change}</p>
                            </div>
                            <div className={`p-3 rounded-lg bg-gradient-to-r ${stat.color}`}>
                              <stat.icon className="h-6 w-6 text-white" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </StaggerContainer>

              {/* 系统状态 */}
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                className="mb-8"
              >
                <Card className="card-modern">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Activity className="h-5 w-5 text-green-400" />
                      <span>系统状态</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-4">
                      {[
                        { name: "API 服务", status: "正常", color: "green" },
                        { name: "数据库", status: "正常", color: "green" },
                        { name: "存储服务", status: "正常", color: "green" },
                      ].map((service, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-3 bg-black/40 rounded-lg border border-white/10"
                        >
                          <span className="font-medium text-white">{service.name}</span>
                          <div className="flex items-center space-x-2">
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-sm text-green-400">{service.status}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "users" && (
            <motion.div
              key="users"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                className="mb-8"
              >
                <Card className="card-modern">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Users className="h-5 w-5 text-blue-400" />
                      <span>用户管理</span>
                    </CardTitle>
                    <CardDescription className="text-white/70">管理系统用户和权限</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : users.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Users className="h-12 w-12 text-white/30 mb-4" />
                        <h3 className="text-lg font-medium text-white/80 mb-2">暂无用户数据</h3>
                        <p className="text-sm text-white/60">当前数据库中没有用户记录</p>
                        <button
                          onClick={() => fetchUsers()}
                          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        >
                          刷新数据
                        </button>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-white/20">
                              <th className="text-left py-3 px-4 text-white/80">用户ID</th>
                              <th className="text-left py-3 px-4 text-white/80">用户名</th>
                              <th className="text-left py-3 px-4 text-white/80">邮箱</th>
                              <th className="text-left py-3 px-4 text-white/80">上传数</th>
                              <th className="text-left py-3 px-4 text-white/80">最后活跃</th>
                            </tr>
                          </thead>
                          <tbody>
                            {users.map((user, index) => (
                              <motion.tr
                                key={user.id}
                                variants={listItemVariants}
                                custom={index}
                                className="border-b border-white/10 hover:bg-white/10 transition-colors"
                              >
                                <td className="py-3 px-4 text-white">{user.id}</td>
                                <td className="py-3 px-4 font-medium text-white">
                                  {user.username}
                                </td>
                                <td className="py-3 px-4 text-white/80">{user.email}</td>
                                <td className="py-3 px-4 text-white/80">{user.uploads}</td>
                                <td className="py-3 px-4">
                                  <div className="flex items-center space-x-2">
                                    <Clock className="h-4 w-4 text-white/60" />
                                    <span className="text-sm text-white/70">
                                      {new Date(user.lastActive).toLocaleDateString()}
                                    </span>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "analytics" && (
            <motion.div
              key="analytics"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                className="mb-8"
              >
                <Card className="card-modern">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <PieChart className="h-5 w-5 text-purple-400" />
                      <span>数据分析</span>
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      系统使用情况和性能指标
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-12">
                      <PieChart className="h-16 w-16 text-white/40 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-white mb-2">数据分析功能</h3>
                      <p className="text-white/70">详细的数据分析功能正在开发中，敬请期待！</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}

          {activeTab === "ip-management" && (
            <motion.div
              key="ip-management"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <IPManagement accessToken={accessToken || ""} adminToken={adminToken || ""} />
            </motion.div>
          )}

          {activeTab === "system-monitor" && (
            <motion.div
              key="system-monitor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <SystemMonitor accessToken={accessToken || ""} adminToken={adminToken || ""} />
            </motion.div>
          )}

          {activeTab === "data-management" && (
            <motion.div
              key="data-management"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <motion.div
                variants={cardHoverVariants}
                initial="rest"
                whileHover="hover"
                className="mb-8"
              >
                <Card className="card-modern">
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2 text-white">
                      <Database className="h-5 w-5 text-blue-400" />
                      <span>数据管理</span>
                    </CardTitle>
                    <CardDescription className="text-white/70">
                      管理所有上传的图片和用户数据
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="flex justify-center py-8">
                        <LoadingSpinner size="lg" />
                      </div>
                    ) : images.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-16 text-center">
                        <Database className="h-12 w-12 text-white/30 mb-4" />
                        <h3 className="text-lg font-medium text-white/80 mb-2">暂无图片数据</h3>
                        <p className="text-sm text-white/60 mb-4">当前数据库中没有图片记录</p>
                        <button
                          onClick={() => fetchImages()}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors"
                        >
                          刷新数据
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {images.map((image, index) => (
                          <motion.div
                            key={image.id}
                            variants={listItemVariants}
                            custom={index}
                            className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center space-x-4">
                                  <img
                                    src={image.url}
                                    alt={image.filename}
                                    className="w-24 h-24 object-cover rounded-md"
                                  />
                                  <div className="flex-1">
                                    <h3 className="text-white font-medium">{image.filename}</h3>
                                    <p className="text-sm text-white/60">用户: {image.username}</p>
                                    <p className="text-sm text-white/60">
                                      {new Date(image.uploadDate).toLocaleString("zh-CN")}
                                    </p>
                                    <p className="text-xs text-white/50">
                                      {image.fileSize} bytes · {image.mimeType}
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteImage(image.key)}
                                className="ml-4"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                删除
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <Footer />
      </motion.div>

      {/* 通知容器 */}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
        position="top-right"
      />
    </DynamicBackground>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
    },
  },
});

export default function AdminPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminContent />
    </QueryClientProvider>
  );
}
