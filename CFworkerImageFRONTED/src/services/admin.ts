/**
 * Admin related API calls
 */
import { getAuth } from "./auth";
import { env } from "@/config/env";

// 获取 uploader API 的 origin（移除 /upload 后缀）
const getApiBaseUrl = () => {
  try {
    const url = new URL(env.uploadApi);
    return url.origin;
  } catch {
    return "https://uploader-worker-prod.haoweiw370.workers.dev";
  }
};

const API_BASE_URL = getApiBaseUrl();

export async function listBannedIPs(adminToken: string) {
  const auth = getAuth();
  if (!auth) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE_URL}/auth/admin/list-banned`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Admin-Token": adminToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch banned IPs");
  }

  const data = await res.json();
  return data.data || [];
}

export async function banIP(
  adminToken: string,
  ip: string,
  durationMs?: number
) {
  const auth = getAuth();
  if (!auth) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE_URL}/auth/admin/ban`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Admin-Token": adminToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ip, duration: durationMs }),
  });

  if (!res.ok) {
    throw new Error("Failed to ban IP");
  }

  return await res.json();
}

export async function unbanIP(adminToken: string, ip: string) {
  const auth = getAuth();
  if (!auth) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE_URL}/auth/admin/unban`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Admin-Token": adminToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ ip }),
  });

  if (!res.ok) {
    throw new Error("Failed to unban IP");
  }

  return await res.json();
}

export async function deleteInvalidRecords(r2ObjectKeys: string[]) {
  const auth = getAuth();
  if (!auth) throw new Error("Not authenticated");

  // 构建查询参数
  const params = new URLSearchParams();
  r2ObjectKeys.forEach((key) => params.append("key", key));

  const res = await fetch(
    `${API_BASE_URL}/api/clean-invalid?${params.toString()}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${auth.accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    throw new Error("Failed to delete invalid records");
  }

  return await res.json();
}

// 获取数据库统计信息
export async function getDatabaseStats(adminToken: string) {
  const auth = getAuth();
  if (!auth) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE_URL}/api/admin/stats`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Admin-Token": adminToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch database stats");
  }

  const data = await res.json();
  return data.data;
}

// 获取用户列表
export async function getUsersList(adminToken: string) {
  const auth = getAuth();
  if (!auth) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE_URL}/api/admin/users`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Admin-Token": adminToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch users list");
  }

  const data = await res.json();
  return data.data;
}

// 获取系统设置
export async function getSystemSettings(adminToken: string) {
  const auth = getAuth();
  if (!auth) throw new Error("Not authenticated");

  const res = await fetch(`${API_BASE_URL}/api/admin/settings`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${auth.accessToken}`,
      "X-Admin-Token": adminToken,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch system settings");
  }

  const data = await res.json();
  return data.data;
}
