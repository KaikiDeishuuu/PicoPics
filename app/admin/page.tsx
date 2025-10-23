"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

// 强制动态渲染，避免静态化
export const dynamic = "force-dynamic";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{
    login: string;
    [key: string]: unknown;
  } | null>(null);
  const [adminToken, setAdminToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [stats, setStats] = useState<{
    totalImages: number;
    totalUsers: number;
    totalSize: string;
    todayUploads: number;
  } | null>(null);
  const [users, setUsers] = useState<
    {
      id: number;
      username: string;
      email: string;
      uploads: number;
      lastActive: string;
    }[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 检查认证状态
    if (typeof window === "undefined") return;

    const authData = localStorage.getItem("auth");
    if (authData) {
      try {
        const auth = JSON.parse(authData);
        if (auth.user && auth.accessToken) {
          setIsAuthenticated(true);
          setUser(auth.user);
        }
      } catch (error) {
        console.error("Failed to parse auth data:", error);
      }
    }
  }, []);

  const handleAdminTokenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminToken.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // 调用后端 API 验证管理员令牌
      if (typeof window === "undefined") {
        setError("服务端渲染时无法验证管理员令牌");
        return;
      }

      const authData = localStorage.getItem("auth");
      if (!authData) {
        setError("请先登录");
        return;
      }

      const auth = JSON.parse(authData);
      const adminApi =
        process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev";
      console.log("Fetching admin stats from:", adminApi);

      const response = await fetch(`${adminApi}/api/admin/stats`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "X-Admin-Token": adminToken,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        setIsAdmin(true);
        setError(null);
      } else {
        setError("无效的管理员令牌");
      }
    } catch (err) {
      console.error("Admin token verification error:", err);
      setError("验证失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = useCallback(async () => {
    if (!isAdmin || !adminToken) return;

    try {
      setLoading(true);
      if (typeof window === "undefined") return;

      const authData = localStorage.getItem("auth");
      if (!authData) return;

      const auth = JSON.parse(authData);
      const adminApi =
        process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev";
      console.log("Fetching admin stats from:", adminApi);

      const response = await fetch(`${adminApi}/api/admin/stats`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "X-Admin-Token": adminToken,
          "Content-Type": "application/json",
        },
      });

      console.log("Admin stats response:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Admin stats data:", data);
        setStats(data.data || data);
      } else {
        const errorData = await response.json();
        console.error("Admin stats error:", errorData);
        setError(errorData.error || "获取统计数据失败");
      }
    } catch (err) {
      console.error("Fetch stats error:", err);
      setError("获取统计数据失败");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, adminToken]);

  const fetchUsers = useCallback(async () => {
    if (!isAdmin || !adminToken) return;

    try {
      setLoading(true);
      if (typeof window === "undefined") return;

      const authData = localStorage.getItem("auth");
      if (!authData) return;

      const auth = JSON.parse(authData);
      const adminApi =
        process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://uploader-worker-v2-prod.haoweiw370.workers.dev";
      console.log("Fetching admin users from:", adminApi);

      const response = await fetch(`${adminApi}/api/admin/users`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${auth.accessToken}`,
          "X-Admin-Token": adminToken,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else {
        setError("获取用户列表失败");
      }
    } catch (err) {
      console.error("Fetch users error:", err);
      setError("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }, [isAdmin, adminToken]);

  useEffect(() => {
    if (isAdmin) {
      fetchStats();
      fetchUsers();
    }
  }, [isAdmin, fetchStats, fetchUsers]);

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-8">
              管理员面板
            </h1>
            <p className="text-xl text-gray-600 mb-8">请先登录以访问管理功能</p>
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-8 rounded-lg transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="container mx-auto px-4 py-16">
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                管理员验证
              </h1>
              <p className="text-gray-600 mb-6 text-center">
                请输入管理员令牌以访问管理功能
              </p>

              <form onSubmit={handleAdminTokenSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="adminToken"
                    className="block text-sm font-medium text-gray-700 mb-2"
                  >
                    管理员令牌
                  </label>
                  <input
                    type="password"
                    id="adminToken"
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="输入管理员令牌"
                    required
                  />
                </div>

                {error && (
                  <div className="text-red-600 text-sm text-center">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                >
                  {loading ? "验证中..." : "验证令牌"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <Link
                  href="/"
                  className="text-gray-600 hover:text-gray-800 text-sm"
                >
                  返回首页
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">管理员面板</h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-700">欢迎, {user?.login}</span>
            <Link
              href="/"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              返回首页
            </Link>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              总图片数
            </h3>
            <p className="text-3xl font-bold text-blue-600">
              {stats?.totalImages || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              总用户数
            </h3>
            <p className="text-3xl font-bold text-green-600">
              {stats?.totalUsers || 0}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              存储使用
            </h3>
            <p className="text-3xl font-bold text-purple-600">
              {stats?.totalSize || "0 GB"}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              今日上传
            </h3>
            <p className="text-3xl font-bold text-orange-600">
              {stats?.todayUploads || 0}
            </p>
          </div>
        </div>

        {/* 用户列表 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">用户管理</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    用户名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    邮箱
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    上传数
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    最后活跃
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.uploads}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastActive}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 系统设置 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">系统设置</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                上传限制
              </h3>
              <p className="text-gray-600">单文件最大: 10MB</p>
              <p className="text-gray-600">每日配额: 100MB</p>
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                安全设置
              </h3>
              <p className="text-gray-600">IP 黑名单: 已启用</p>
              <p className="text-gray-600">内容审核: 已启用</p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
