/**
 * GitHub OAuth 认证服务
 * 通过 Worker 代理访问 GitHub API
 */

// 从 UPLOAD_API 中提取基础 URL
const getApiBaseUrl = () => {
  const uploadApi = process.env.NEXT_PUBLIC_UPLOAD_API;

  if (!uploadApi) {
    return "https://uploader-worker-prod.haoweiw370.workers.dev";
  }

  try {
    // 解析 URL
    const url = new URL(uploadApi);
    // 返回 origin (协议 + 域名)
    return url.origin;
  } catch (e) {
    console.error("Invalid NEXT_PUBLIC_UPLOAD_API:", uploadApi, e);
    return "https://uploader-worker-prod.haoweiw370.workers.dev";
  }
};

const API_BASE_URL = getApiBaseUrl();

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  email: string;
}

export interface AuthToken {
  accessToken: string;
  user: GitHubUser;
  expiresAt: number;
}

/**
 * 启动 GitHub Device Flow 认证
 */
export async function initiateGitHubAuth(): Promise<{
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  expiresIn: number;
  interval: number;
}> {
  const response = await fetch(`${API_BASE_URL}/auth/github/device`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to initiate GitHub authentication");
  }

  const data = await response.json();

  return {
    deviceCode: data.device_code,
    userCode: data.user_code,
    verificationUri: data.verification_uri,
    expiresIn: data.expires_in,
    interval: data.interval,
  };
}

/**
 * 轮询检查用户是否已授权
 */
export async function pollGitHubAuth(deviceCode: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/auth/github/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      device_code: deviceCode,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to poll GitHub authentication");
  }

  const data = await response.json();

  if (data.error) {
    if (data.error === "authorization_pending") {
      throw new Error("PENDING");
    }
    if (data.error === "slow_down") {
      throw new Error("SLOW_DOWN");
    }
    throw new Error(data.error_description || data.error);
  }

  return data.access_token;
}

/**
 * 获取 GitHub 用户信息
 */
export async function getGitHubUser(accessToken: string): Promise<GitHubUser> {
  const response = await fetch("https://api.github.com/user", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/vnd.github.v3+json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch GitHub user");
  }

  return await response.json();
}

/**
 * 保存认证信息到 localStorage
 */
export function saveAuth(token: AuthToken): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("github_auth", JSON.stringify(token));
}

/**
 * 从 localStorage 获取认证信息
 */
export function getAuth(): AuthToken | null {
  if (typeof window === "undefined") return null;

  const stored = localStorage.getItem("github_auth");
  if (!stored) return null;

  try {
    const token: AuthToken = JSON.parse(stored);

    // 检查是否过期
    if (Date.now() > token.expiresAt) {
      clearAuth();
      return null;
    }

    return token;
  } catch {
    return null;
  }
}

/**
 * 清除认证信息
 */
export function clearAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("github_auth");
}

/**
 * 验证 token 是否有效
 */
export async function verifyToken(accessToken: string): Promise<boolean> {
  try {
    const response = await fetch("https://api.github.com/user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/vnd.github.v3+json",
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}
