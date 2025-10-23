import { env } from "../config/env";
import type { GitHubUser } from "../types";

// 获取 API 基础 URL
const getApiBaseUrl = () => {
  try {
    const url = new URL(env.uploadApi);
    return url.origin;
  } catch (e) {
    console.error("Invalid uploadApi:", env.uploadApi, e);
    return "https://uploader-worker-v2-prod.haoweiw370.workers.dev";
  }
};

const API_BASE_URL = getApiBaseUrl();

// 验证 GitHub Token
export async function verifyGitHubToken(token: string): Promise<{
  valid: boolean;
  user?: GitHubUser;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/github/verify`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        return { valid: false, error: "无效的访问令牌" };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { valid: true, user: data.user };
  } catch (error) {
    console.error("Verify GitHub token error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "验证令牌失败",
    };
  }
}

// 获取 GitHub 设备代码
export async function getGitHubDeviceCode(): Promise<{
  success: boolean;
  deviceCode?: string;
  userCode?: string;
  verificationUri?: string;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/github/device`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, ...data };
  } catch (error) {
    console.error("Get GitHub device code error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取设备代码失败",
    };
  }
}

// 轮询 GitHub 认证状态
export async function pollGitHubAuth(deviceCode: string): Promise<{
  success: boolean;
  accessToken?: string;
  user?: GitHubUser;
  error?: string;
}> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/github/poll`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ deviceCode }),
    });

    if (!response.ok) {
      if (response.status === 400) {
        return { success: false, error: "设备代码无效或已过期" };
      }
      if (response.status === 202) {
        return { success: false, error: "等待用户授权" };
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, accessToken: data.accessToken, user: data.user };
  } catch (error) {
    console.error("Poll GitHub auth error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "轮询认证状态失败",
    };
  }
}
