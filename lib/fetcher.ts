// 环境配置
const env = {
  apiTimeout: 30000,
  maxUploadSize: 10485760,
};

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  url?: string;
  fileName?: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
  error?: string;
}

export async function uploadFile(
  endpoint: string,
  file: File,
  onProgress?: (progress: number) => void,
  accessToken?: string
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    // 设置进度监听
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const percentage = Math.round((event.loaded / event.total) * 100);
        onProgress(percentage);
      }
    });

    // 设置响应处理
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error("Invalid response format"));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
        }
      }
    });

    // 设置错误处理
    xhr.addEventListener("error", () => {
      reject(new Error("Network error"));
    });

    // 设置超时
    xhr.timeout = env.apiTimeout;
    xhr.addEventListener("timeout", () => {
      reject(new Error("Request timeout"));
    });

    // 配置请求
    xhr.open("POST", endpoint);

    // 设置认证头部
    if (accessToken) {
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    }

    // 创建 FormData
    const formData = new FormData();
    formData.append("image", file);

    // 发送请求
    xhr.send(formData);
  });
}

export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = env.apiTimeout
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("Request timeout");
    }
    throw err;
  }
}
