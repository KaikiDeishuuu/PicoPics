"use client";

import { motion } from "framer-motion";
import {
  AlertTriangle,
  Ban,
  CheckCircle,
  Clock,
  Plus,
  Search,
  Shield,
  Trash2,
  Unlock,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface IPRecord {
  ip: string;
  reason: string;
  addedAt: string;
  addedBy: string;
  status: "active" | "expired";
}

interface IPManagementProps {
  accessToken: string;
  adminToken: string;
}

export function IPManagement({ accessToken, adminToken }: IPManagementProps) {
  const [ipList, setIpList] = useState<IPRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newIP, setNewIP] = useState("");
  const [newReason, setNewReason] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  // 获取IP黑名单
  const fetchIPList = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_UPLOAD_API ||
          "https://uploader-worker-v2-prod.haoweiw370.workers.dev"
        }/api/admin/ip-blacklist`,
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
        setIpList(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch IP list:", error);
    } finally {
      setLoading(false);
    }
  };

  // 添加IP到黑名单
  const addToBlacklist = async () => {
    if (!newIP.trim()) return;

    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_UPLOAD_API ||
          "https://uploader-worker-v2-prod.haoweiw370.workers.dev"
        }/api/admin/ip-blacklist`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Admin-Token": adminToken,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ip: newIP.trim(),
            reason: newReason.trim() || "Manual ban",
          }),
        }
      );

      if (response.ok) {
        setNewIP("");
        setNewReason("");
        setShowAddForm(false);
        fetchIPList();
      }
    } catch (error) {
      console.error("Failed to add IP to blacklist:", error);
    }
  };

  // 从黑名单移除IP
  const removeFromBlacklist = async (ip: string) => {
    try {
      const response = await fetch(
        `${
          process.env.NEXT_PUBLIC_UPLOAD_API ||
          "https://uploader-worker-v2-prod.haoweiw370.workers.dev"
        }/api/admin/ip-blacklist/${ip}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Admin-Token": adminToken,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        fetchIPList();
      }
    } catch (error) {
      console.error("Failed to remove IP from blacklist:", error);
    }
  };

  useEffect(() => {
    fetchIPList();
  }, [accessToken, adminToken]);

  const filteredIPs = ipList.filter(
    (record) =>
      record.ip.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.reason.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 头部操作栏 */}
      <Card className="card-modern">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="h-6 w-6 text-blue-400" />
              <CardTitle className="text-foreground">
                IP Blacklist Management
              </CardTitle>
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add IP
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search IP..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-background border-border text-foreground placeholder-muted-foreground w-full"
                />
              </div>
            </div>
            <Button
              onClick={fetchIPList}
              disabled={loading}
              variant="outline"
              className="border-border text-foreground hover:bg-muted/50 h-10 flex-shrink-0"
            >
              <Clock
                className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
              />
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">Ref</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 添加IP表单 */}
      {showAddForm && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
        >
          <Card className="card-modern">
            <CardHeader>
              <CardTitle className="text-foreground">
                Add IP to Blacklist
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    IP Address
                  </label>
                  <Input
                    placeholder="192.168.1.1 or 192.168.1.0/24"
                    value={newIP}
                    onChange={(e) => setNewIP(e.target.value)}
                    className="bg-background border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Reason
                  </label>
                  <Input
                    placeholder="Reason for banning this IP"
                    value={newReason}
                    onChange={(e) => setNewReason(e.target.value)}
                    className="bg-background border-border text-foreground placeholder-muted-foreground"
                  />
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  onClick={addToBlacklist}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  <Ban className="h-4 w-4 mr-2" />
                  Ban IP
                </Button>
                <Button
                  onClick={() => setShowAddForm(false)}
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted/50"
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* IP列表 */}
      <Card className="card-modern">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-foreground">
              Blacklisted IPs ({filteredIPs.length})
            </CardTitle>
            <Badge variant="outline" className="border-red-500/50 text-red-400">
              {ipList.filter((ip) => ip.status === "active").length} Active
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
          ) : filteredIPs.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No IP addresses found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIPs.map((record, index) => (
                <motion.div
                  key={record.ip}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-muted/30 rounded-lg border border-border/50"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <code className="text-foreground font-mono text-sm bg-muted px-2 py-1 rounded">
                        {record.ip}
                      </code>
                      <Badge
                        variant={
                          record.status === "active"
                            ? "destructive"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {record.status === "active" ? (
                          <>
                            <Ban className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Expired
                          </>
                        )}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm mt-1">
                      {record.reason}
                    </p>
                    <p className="text-muted-foreground/70 text-xs mt-1">
                      Added by {record.addedBy} on{" "}
                      {new Date(record.addedAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {record.status === "active" && (
                      <Button
                        onClick={() => removeFromBlacklist(record.ip)}
                        size="sm"
                        variant="outline"
                        className="border-green-500/50 text-green-400 hover:bg-green-500/20"
                      >
                        <Unlock className="h-4 w-4 mr-1" />
                        Unban
                      </Button>
                    )}
                    <Button
                      onClick={() => removeFromBlacklist(record.ip)}
                      size="sm"
                      variant="outline"
                      className="border-red-500/50 text-red-400 hover:bg-red-500/20"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
