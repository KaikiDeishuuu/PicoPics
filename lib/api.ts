import { z } from "zod";

// API Response Schema
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
  message: z.string().optional(),
});

export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  message?: string;
};

// Upload Schema
export const UploadSchema = z.object({
  id: z.string(),
  url: z.string(),
  filename: z.string(),
  size: z.number(),
  type: z.string(),
  uploadedAt: z.string(),
  r2ObjectKey: z.string(),
});

export type UploadResult = z.infer<typeof UploadSchema>;

// Image History Schema
export const ImageHistorySchema = z.object({
  id: z.string(),
  fileName: z.string(),
  url: z.string(),
  size: z.number(),
  type: z.string(),
  uploadedAt: z.string(),
  r2ObjectKey: z.string(),
});

export type ImageHistoryRecord = z.infer<typeof ImageHistorySchema>;

// Admin Stats Schema
export const AdminStatsSchema = z.object({
  totalImages: z.number(),
  totalUsers: z.number(),
  totalSize: z.string(),
  todayUploads: z.number(),
});

export type AdminStats = z.infer<typeof AdminStatsSchema>;

// User Schema
export const UserSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  uploads: z.number(),
  lastActive: z.string(),
});

export type User = z.infer<typeof UserSchema>;

export type UploadTask<T> = {
  promise: Promise<ApiResponse<T>>;
  cancel: () => void;
};

const DEFAULT_UPLOAD_API_BASE = "https://api.hiaplha.xyz";
const DEFAULT_HISTORY_API_BASE = "https://history.hiaplha.xyz";

function parseJsonSafely(payload: string): unknown {
  if (!payload) {
    return undefined;
  }
  try {
    return JSON.parse(payload);
  } catch {
    return undefined;
  }
}

function extractErrorText(payload: unknown): string | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const candidate = payload as { error?: unknown; message?: unknown };
  if (typeof candidate.error === "string") {
    return candidate.error;
  }
  if (typeof candidate.message === "string") {
    return candidate.message;
  }
  return undefined;
}

function normalizeUploadError(status: number, payload?: unknown): ApiResponse<never> {
  const fallbackByStatus: Record<number, string> = {
    401: "Authentication required. Please log in again.",
    403: "You do not have permission to upload this file.",
    413: "File too large. Maximum upload size is 10MB.",
    415: "Unsupported file type. Please upload JPG, PNG, GIF, or WebP.",
    429: "Too many upload attempts. Please try again later.",
    500: "Server error while uploading. Please retry in a moment.",
  };
  const payloadError = extractErrorText(payload);
  const payloadCode =
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { code?: unknown }).code === "string"
      ? (payload as { code: string }).code
      : undefined;
  const payloadMessage =
    typeof payload === "object" &&
    payload !== null &&
    typeof (payload as { message?: unknown }).message === "string"
      ? (payload as { message: string }).message
      : undefined;

  return {
    success: false,
    error: payloadError || fallbackByStatus[status] || `Upload failed (HTTP ${status})`,
    code: payloadCode,
    message: payloadMessage,
  };
}

// API Client with type safety
export class ApiClient {
  private baseUrl: string;
  private accessToken?: string;

  constructor(baseUrl: string, accessToken?: string) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = new Headers(options.headers);

    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (this.accessToken) {
      headers.set("Authorization", `Bearer ${this.accessToken}`);
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || `HTTP ${response.status}`,
          code: data.code,
        };
      }

      return {
        success: true,
        data: data.data || data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }

  // Upload methods
  async uploadFile(
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<UploadResult>> {
    return this.uploadFileTask(file, onProgress).promise;
  }

  uploadFileTask(file: File, onProgress?: (progress: number) => void): UploadTask<UploadResult> {
    let aborted = false;
    const xhr = new XMLHttpRequest();
    const promise = new Promise<ApiResponse<UploadResult>>((resolve) => {
      const formData = new FormData();
      formData.append("image", file);

      // 在开发环境中使用本地API路由
      const uploadUrl =
        process.env.NODE_ENV === "development" ? "/api/upload" : `${this.baseUrl}/upload`;

      // 设置超时时间
      xhr.timeout = 60000; // 60秒超时

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage);
        }
      });

      xhr.addEventListener("load", () => {
        const payload = parseJsonSafely(xhr.responseText);

        if (xhr.status >= 200 && xhr.status < 300) {
          if (payload && typeof payload === "object") {
            const response = payload as { data?: UploadResult } & UploadResult;
            resolve({
              success: true,
              data: response.data || response,
            });
            return;
          }
          resolve({
            success: false,
            error: "Upload succeeded but returned an invalid response.",
          });
          return;
        } else {
          resolve(normalizeUploadError(xhr.status, payload));
        }
      });

      xhr.addEventListener("error", () => {
        if (aborted) {
          resolve({
            success: false,
            error: "Upload cancelled",
            code: "UPLOAD_CANCELLED",
          });
          return;
        }
        resolve({
          success: false,
          error: "Network error",
        });
      });

      xhr.addEventListener("timeout", () => {
        resolve({
          success: false,
          error: "Upload timeout",
        });
      });

      xhr.open("POST", uploadUrl);
      if (this.accessToken) {
        xhr.setRequestHeader("Authorization", `Bearer ${this.accessToken}`);
      }
      xhr.send(formData);
    });

    return {
      promise,
      cancel: () => {
        aborted = true;
        xhr.abort();
      },
    };
  }

  // History methods
  async getUserHistory(): Promise<ApiResponse<ImageHistoryRecord[]>> {
    return this.request<ImageHistoryRecord[]>("/api/history");
  }

  async deleteImage(r2ObjectKey: string): Promise<ApiResponse> {
    return this.request("/api/delete", {
      method: "DELETE",
      body: JSON.stringify({ r2ObjectKey }),
    });
  }

  async cleanInvalidRecords(): Promise<ApiResponse<{ deleted: string[] }>> {
    return this.request<{ deleted: string[] }>("/api/clean-invalid", {
      method: "POST",
    });
  }

  // Admin methods
  async getAdminStats(): Promise<ApiResponse<AdminStats>> {
    return this.request<AdminStats>("/api/admin/stats");
  }

  async getUsers(): Promise<ApiResponse<User[]>> {
    return this.request<User[]>("/api/admin/users");
  }

  async getSystemSettings(): Promise<ApiResponse<unknown>> {
    return this.request("/api/admin/settings");
  }
}

// Factory function for creating API client
export function createApiClient(accessToken?: string): ApiClient {
  // 在开发环境中使用本地API路由，生产环境使用worker
  const uploadApi =
    process.env.NODE_ENV === "development"
      ? "" // 使用相对路径，会调用本地的 /api/upload
      : process.env.NEXT_PUBLIC_UPLOAD_API || DEFAULT_UPLOAD_API_BASE;
  const baseUrl = uploadApi;

  return new ApiClient(baseUrl, accessToken);
}

// Create history-specific API client
export function createHistoryApiClient(accessToken?: string): ApiClient {
  // History API uses a different worker
  const historyApi = process.env.NEXT_PUBLIC_HISTORY_API || DEFAULT_HISTORY_API_BASE;

  // Use the history API base URL directly
  const baseUrl = historyApi;

  return new ApiClient(baseUrl, accessToken);
}
