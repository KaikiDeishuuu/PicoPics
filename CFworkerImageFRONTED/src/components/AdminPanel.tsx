"use client";

import { useEffect, useState, useCallback } from "react";
import {
  listBannedIPs,
  banIP,
  unbanIP,
  getDatabaseStats,
  getUsersList,
  getSystemSettings,
  deleteInvalidRecords,
} from "@/services/admin";
import { useAdminStatsRefresh } from "@/hooks/useGlobalState";

interface BannedRecord {
  ip: string;
  uploadCount?: number;
  totalBytes?: number;
  firstUploadTime?: number;
  lastUploadTime?: number;
  violations?: number;
  banned?: boolean;
  banExpiry?: number;
}

interface DatabaseStats {
  userCount: number;
  imageCount: number;
  totalSize: number;
  todayUploads: number;
  weeklyStats: Array<{ date: string; count: number }>;
}

interface UserInfo {
  user_id: string;
  image_count: number;
  total_size: number;
  first_upload: string;
  last_upload: string;
}

interface SystemSettings {
  maxFileSize: number;
  allowedTypes: string;
  quotaEnabled: boolean;
  dailyQuota: number;
  aiModeration: boolean;
  telegramNotifications: boolean;
}

export default function AdminPanel({ adminToken }: { adminToken: string }) {
  const [records, setRecords] = useState<BannedRecord[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "banned" | "stats" | "users" | "settings"
  >("banned");

  // 全局状态管理
  const { refreshTrigger } = useAdminStatsRefresh();

  const fetchBanned = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const list = await listBannedIPs(adminToken);
      setRecords(list);
    } catch {
      setError("获取黑名单失败");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const stats = await getDatabaseStats(adminToken);
      setStats(stats);
    } catch {
      setError("获取统计信息失败");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const users = await getUsersList(adminToken);
      setUsers(users);
    } catch {
      setError("获取用户列表失败");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const settings = await getSystemSettings(adminToken);
      setSettings(settings);
    } catch {
      setError("获取系统设置失败");
    } finally {
      setLoading(false);
    }
  }, [adminToken]);

  const handleCleanInvalidRecords = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 这里我们需要获取所有无效记录的键
      // 由于我们没有直接的 API 来获取所有无效记录，我们使用一个通用的清理方法
      const result = await deleteInvalidRecords([]);

      if (result.success) {
        // 刷新统计数据
        await fetchStats();
        await fetchUsers();
        alert(`清理完成！删除了 ${result.deleted?.length || 0} 个无效记录`);
      } else {
        setError(result.error || "清理失败");
      }
    } catch (err) {
      setError("清理无效记录失败");
    } finally {
      setLoading(false);
    }
  }, [adminToken, fetchStats, fetchUsers]);

  useEffect(() => {
    if (adminToken) {
      if (activeTab === "banned") fetchBanned();
      else if (activeTab === "stats") fetchStats();
      else if (activeTab === "users") fetchUsers();
      else if (activeTab === "settings") fetchSettings();
    }
  }, [
    adminToken,
    activeTab,
    fetchBanned,
    fetchStats,
    fetchUsers,
    fetchSettings,
  ]);

  // 监听统计数据刷新触发器
  useEffect(() => {
    if (refreshTrigger > 0 && adminToken) {
      if (activeTab === "stats") {
        fetchStats();
      } else if (activeTab === "users") {
        fetchUsers();
      }
    }
  }, [refreshTrigger, adminToken, activeTab, fetchStats, fetchUsers]);

  const handleUnban = async (ip: string) => {
    try {
      await unbanIP(adminToken, ip);
      setRecords((prev) => prev.filter((r) => r.ip !== ip));
    } catch {
      alert("解封失败");
    }
  };

  const handleBan = async () => {
    const ip = prompt("请输入要封禁的 IP 地址：");
    if (!ip) return;

    try {
      await banIP(adminToken, ip);
      fetchBanned();
    } catch {
      alert("封禁失败");
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  return (
    <div>
      {/* 标签页导航 */}
      <div className="flex space-x-1 mb-6 bg-white/5 rounded-lg p-1">
        {[
          { key: "banned", label: "IP黑名单" },
          { key: "stats", label: "数据统计" },
          { key: "users", label: "用户管理" },
          { key: "settings", label: "系统设置" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() =>
              setActiveTab(tab.key as "banned" | "stats" | "users" | "settings")
            }
            className={`flex-1 px-4 py-2.5 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.key
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/5"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 内容区域 */}
      {loading && (
        <div className="text-white/60 text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin"></div>
          <div className="mt-4">加载中...</div>
        </div>
      )}
      {error && (
        <div className="text-red-400 text-center py-8 bg-red-500/10 rounded-lg border border-red-500/20">
          {error}
        </div>
      )}

      {/* IP黑名单标签页 */}
      {activeTab === "banned" && !loading && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-white">
                IP 黑名单管理
              </h4>
              <p className="text-sm text-white/60 mt-1">管理被封禁的IP地址</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleBan}
                className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-300 rounded-lg border border-red-500/20 transition-all text-sm font-medium"
              >
                + 封禁IP
              </button>
              <button
                onClick={fetchBanned}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg border border-white/10 transition-all text-sm font-medium"
              >
                刷新
              </button>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-lg border border-white/10">
              <div className="text-white/40 text-lg mb-2">暂无封禁记录</div>
              <div className="text-white/30 text-sm">系统运行正常</div>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map((r) => (
                <div
                  key={r.ip}
                  className="flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      <div className="text-white font-medium">{r.ip}</div>
                      {r.banExpiry && (
                        <div className="text-xs text-orange-300 bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">
                          自动解封: {new Date(r.banExpiry).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="text-sm text-white/60 flex flex-wrap gap-4">
                      <span>上传: {r.uploadCount || 0} 次</span>
                      <span>违规: {r.violations || 0} 次</span>
                      {r.totalBytes && (
                        <span>大小: {formatBytes(r.totalBytes)}</span>
                      )}
                    </div>
                    {r.firstUploadTime && (
                      <div className="text-xs text-white/40 mt-2">
                        首次: {new Date(r.firstUploadTime).toLocaleString()} |
                        最后:{" "}
                        {r.lastUploadTime
                          ? new Date(r.lastUploadTime).toLocaleString()
                          : "未知"}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleUnban(r.ip)}
                    className="ml-4 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-500/20 transition-all text-sm font-medium"
                  >
                    解封
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 数据库统计标签页 */}
      {activeTab === "stats" && !loading && stats && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-white">数据统计</h4>
              <p className="text-sm text-white/60 mt-1">系统使用情况概览</p>
            </div>
            <button
              onClick={fetchStats}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg border border-white/10 transition-all text-sm font-medium"
            >
              刷新
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-6">
              <div className="text-blue-300/60 text-sm font-medium mb-2">
                总用户数
              </div>
              <div className="text-3xl font-bold text-white">
                {stats.userCount}
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-6">
              <div className="text-green-300/60 text-sm font-medium mb-2">
                总图片数
              </div>
              <div className="text-3xl font-bold text-white">
                {stats.imageCount}
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-6">
              <div className="text-purple-300/60 text-sm font-medium mb-2">
                存储使用
              </div>
              <div className="text-3xl font-bold text-white">
                {formatBytes(stats.totalSize)}
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-6">
              <div className="text-orange-300/60 text-sm font-medium mb-2">
                今日上传
              </div>
              <div className="text-3xl font-bold text-white">
                {stats.todayUploads}
              </div>
            </div>
          </div>

          {stats.weeklyStats.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-6">
              <h5 className="text-white font-semibold mb-4">最近7天上传统计</h5>
              <div className="space-y-3">
                {stats.weeklyStats.map((stat, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-all"
                  >
                    <span className="text-white/70">{stat.date}</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-white font-medium">
                        {stat.count} 张
                      </span>
                      <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(
                              (stat.count /
                                Math.max(
                                  ...stats.weeklyStats.map((s) => s.count)
                                )) *
                                100,
                              100
                            )}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 用户管理标签页 */}
      {activeTab === "users" && !loading && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-white">用户管理</h4>
              <p className="text-sm text-white/60 mt-1">查看用户上传统计</p>
            </div>
            <button
              onClick={fetchUsers}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg border border-white/10 transition-all text-sm font-medium"
            >
              刷新
            </button>
          </div>

          {users.length === 0 ? (
            <div className="text-center py-16 bg-white/5 rounded-lg border border-white/10">
              <div className="text-white/40 text-lg mb-2">暂无用户数据</div>
              <div className="text-white/30 text-sm">还没有用户上传过图片</div>
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((user, index) => (
                <div
                  key={index}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-6 transition-all"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="text-white font-semibold text-lg mb-1">
                        用户 ID: {user.user_id}
                      </div>
                      <div className="text-white/60 text-sm">活跃用户</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-white/60 text-sm mb-1">图片数量</div>
                      <div className="text-white font-semibold text-xl">
                        {user.image_count}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-white/60 text-sm mb-1">存储使用</div>
                      <div className="text-white font-semibold text-xl">
                        {formatBytes(user.total_size)}
                      </div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-white/60 text-sm mb-1">平均大小</div>
                      <div className="text-white font-semibold text-xl">
                        {user.image_count > 0
                          ? formatBytes(user.total_size / user.image_count)
                          : "0 Bytes"}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm text-white/50 space-y-1">
                    <div>首次上传: {formatDate(user.first_upload)}</div>
                    <div>最后上传: {formatDate(user.last_upload)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 系统设置标签页 */}
      {activeTab === "settings" && !loading && settings && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h4 className="text-lg font-semibold text-white">系统设置</h4>
              <p className="text-sm text-white/60 mt-1">查看系统配置参数</p>
            </div>
            <button
              onClick={fetchSettings}
              className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg border border-white/10 transition-all text-sm font-medium"
            >
              刷新
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border border-blue-500/20 rounded-lg p-6">
              <div className="text-blue-300 font-semibold mb-4">文件限制</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">最大文件大小</span>
                  <span className="text-white font-medium">
                    {formatBytes(settings.maxFileSize)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">允许类型</span>
                  <span className="text-white font-medium text-xs">
                    {settings.allowedTypes}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 rounded-lg p-6">
              <div className="text-green-300 font-semibold mb-4">配额管理</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">配额状态</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      settings.quotaEnabled
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {settings.quotaEnabled ? "启用" : "禁用"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">每日限制</span>
                  <span className="text-white font-medium">
                    {settings.dailyQuota} 张
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20 rounded-lg p-6">
              <div className="text-purple-300 font-semibold mb-4">AI 功能</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">内容审核</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      settings.aiModeration
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {settings.aiModeration ? "启用" : "禁用"}
                  </span>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20 rounded-lg p-6">
              <div className="text-orange-300 font-semibold mb-4">通知设置</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/70 text-sm">Telegram 通知</span>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      settings.telegramNotifications
                        ? "bg-green-500/20 text-green-300"
                        : "bg-red-500/20 text-red-300"
                    }`}
                  >
                    {settings.telegramNotifications ? "启用" : "禁用"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
