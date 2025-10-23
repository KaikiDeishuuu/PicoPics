import type { AdminStats, UserInfo, SystemSettings } from "../types";
import { env } from "../config/env";

// 获取 uploader API 的 origin（移除 /upload 后缀）
const getApiBaseUrl = () => {
  try {
    const url = new URL(env.uploadApi);
    return url.origin;
  } catch {
    return "https://uploader-worker-v2-prod.haoweiw370.workers.dev";
  }
};

const API_BASE_URL = getApiBaseUrl();

// 获取数据库统计信息
export async function getDatabaseStats(accessToken: string): Promise<{
  success: boolean;
  data?: AdminStats;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Get database stats error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取统计数据失败",
    };
  }
}

// 获取用户列表
export async function getUsersList(accessToken: string): Promise<{
  success: boolean;
  data?: UserInfo[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/users`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Get users list error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取用户列表失败",
    };
  }
}

// 获取系统设置
export async function getSystemSettings(accessToken: string): Promise<{
  success: boolean;
  data?: SystemSettings;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Get system settings error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取系统设置失败",
    };
  }
}

// 删除无效记录
export async function deleteInvalidRecords(r2ObjectKeys: string[]): Promise<{
  success: boolean;
  deleted?: string[];
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/admin/clean-invalid`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ keys: r2ObjectKeys }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, deleted: data.deleted };
  } catch (error) {
    console.error("Delete invalid records error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "删除无效记录失败",
    };
  }
}
