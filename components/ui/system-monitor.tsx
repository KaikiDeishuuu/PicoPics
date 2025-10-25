"use client";

import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Globe,
  Minus,
  RefreshCw,
  Server,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SystemStats {
  cpu: number;
  memory: number;
  disk: number;
  network: {
    in: number;
    out: number;
  };
  uptime: string;
  requests: {
    total: number;
    success: number;
    error: number;
  };
  responseTime: number;
}

interface SystemMonitorProps {
  accessToken: string;
  adminToken: string;
}

export function SystemMonitor({ accessToken, adminToken }: SystemMonitorProps) {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 获取系统状态
  const fetchSystemStats = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_UPLOAD_API ||
          "https://uploader-worker-v2-prod.haoweiw370.workers.dev"
        }/api/admin/system-stats`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Admin-Token": adminToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("Failed to fetch system stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStats();
    const interval = setInterval(fetchSystemStats, 30000); // 30秒更新一次
    return () => clearInterval(interval);
  }, [accessToken, adminToken]);

  const getStatusColor = (value: number, type: "cpu" | "memory" | "disk") => {
    const thresholds = { cpu: 80, memory: 85, disk: 90 };
    if (value >= thresholds[type]) return "text-red-400";
    if (value >= thresholds[type] * 0.7) return "text-yellow-400";
    return "text-green-400";
  };

  const getStatusIcon = (value: number, type: "cpu" | "memory" | "disk") => {
    const thresholds = { cpu: 80, memory: 85, disk: 90 };
    if (value >= thresholds[type]) return <AlertTriangle className="h-4 w-4" />;
    if (value >= thresholds[type] * 0.7) return <Clock className="h-4 w-4" />;
    return <CheckCircle className="h-4 w-4" />;
  };

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <Card className="card-modern">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="h-6 w-6 text-green-400" />
              <CardTitle className="text-white">System Monitor</CardTitle>
            </div>
            <div className="flex items-center space-x-2">
              {lastUpdate && (
                <span className="text-xs text-white/60">
                  Last update: {lastUpdate.toLocaleTimeString()}
                </span>
              )}
              <Button
                onClick={fetchSystemStats}
                disabled={loading}
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {loading && !stats ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      ) : stats ? (
        <>
          {/* 系统资源使用情况 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="card-modern">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white">CPU Usage</CardTitle>
                  <div
                    className={`flex items-center space-x-1 ${getStatusColor(stats.cpu, "cpu")}`}
                  >
                    {getStatusIcon(stats.cpu, "cpu")}
                    <span className="text-sm font-medium">{stats.cpu}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.cpu}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white">Memory Usage</CardTitle>
                  <div
                    className={`flex items-center space-x-1 ${getStatusColor(
                      stats.memory,
                      "memory"
                    )}`}
                  >
                    {getStatusIcon(stats.memory, "memory")}
                    <span className="text-sm font-medium">{stats.memory}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.memory}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-white">Disk Usage</CardTitle>
                  <div
                    className={`flex items-center space-x-1 ${getStatusColor(stats.disk, "disk")}`}
                  >
                    {getStatusIcon(stats.disk, "disk")}
                    <span className="text-sm font-medium">{stats.disk}%</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${stats.disk}%` }}
                  ></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 网络和性能指标 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Globe className="h-5 w-5 text-blue-400" />
                  <span>Network Traffic</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Inbound</span>
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-white font-mono">
                      {(stats.network.in / 1024 / 1024).toFixed(2)} MB/s
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Outbound</span>
                  <div className="flex items-center space-x-2">
                    <TrendingDown className="h-4 w-4 text-red-400" />
                    <span className="text-white font-mono">
                      {(stats.network.out / 1024 / 1024).toFixed(2)} MB/s
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="card-modern">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Server className="h-5 w-5 text-purple-400" />
                  <span>Performance</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Response Time</span>
                  <Badge
                    variant={
                      stats.responseTime < 100
                        ? "default"
                        : stats.responseTime < 500
                          ? "secondary"
                          : "destructive"
                    }
                    className="text-xs"
                  >
                    {stats.responseTime}ms
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80">Uptime</span>
                  <span className="text-white font-mono text-sm">{stats.uptime}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* 请求统计 */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="text-white flex items-center space-x-2">
                <Database className="h-5 w-5 text-yellow-400" />
                <span>Request Statistics</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-1">
                    {stats.requests.total.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/80">Total Requests</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400 mb-1">
                    {stats.requests.success.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/80">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400 mb-1">
                    {stats.requests.error.toLocaleString()}
                  </div>
                  <div className="text-sm text-white/80">Errors</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-white/80 mb-2">
                  <span>Success Rate</span>
                  <span>
                    {stats.requests.total > 0
                      ? ((stats.requests.success / stats.requests.total) * 100).toFixed(1)
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${
                        stats.requests.total > 0
                          ? (stats.requests.success / stats.requests.total) * 100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="card-modern">
          <CardContent className="text-center py-8">
            <AlertTriangle className="h-12 w-12 text-white/40 mx-auto mb-4" />
            <p className="text-white/60">Failed to load system statistics</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
