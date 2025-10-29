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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers.Authorization = `Bearer ${this.accessToken}`;
    }

    console.log("API Request Debug:");
    console.log("URL:", url);
    console.log("Headers:", headers);
    console.log("Options:", options);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log("API Response Debug:");
      console.log("Status:", response.status);
      console.log("Status Text:", response.statusText);
      console.log("Headers:", Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log("Response Data:", data);

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
      console.error("API Request Error:", error);
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
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append("image", file);

      // 在开发环境中使用本地API路由
      const uploadUrl =
        process.env.NODE_ENV === "development" ? "/api/upload" : `${this.baseUrl}/upload`;

      console.log("Upload URL:", uploadUrl);

      // 设置超时时间
      xhr.timeout = 60000; // 60秒超时

      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable && onProgress) {
          const percentage = Math.round((event.loaded / event.total) * 100);
          onProgress(percentage);
        }
      });

      xhr.addEventListener("load", () => {
        console.log("Upload response status:", xhr.status);
        console.log("Upload response text:", xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            console.log("Parsed upload response:", response);
            resolve({
              success: true,
              data: response.data || response,
            });
          } catch (error) {
            console.error("Upload response parse error:", error);
            console.error("Response text:", xhr.responseText);
            resolve({
              success: false,
              error: "Invalid response format",
            });
          }
        } else {
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            resolve({
              success: false,
              error: errorResponse.error || errorResponse.message || `HTTP ${xhr.status}`,
              code: errorResponse.code,
            });
          } catch {
            resolve({
              success: false,
              error: `HTTP ${xhr.status}: ${xhr.statusText}`,
            });
          }
        }
      });

      xhr.addEventListener("error", (event) => {
        console.error("Upload network error:", event);
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
      : process.env.NEXT_PUBLIC_UPLOAD_API ||
        "https://your-upload-worker.workers.dev";
  const baseUrl = uploadApi;

  console.log("API Base URL:", baseUrl);
  console.log("Access Token:", accessToken ? "Present" : "Missing");

  return new ApiClient(baseUrl, accessToken);
}

// Create history-specific API client
export function createHistoryApiClient(accessToken?: string): ApiClient {
  // History API uses a different worker
  const historyApi =
    process.env.NEXT_PUBLIC_HISTORY_API || "https://your-history-worker.workers.dev";

  // Use the history API base URL directly
  const baseUrl = historyApi;

  console.log("History API Base URL:", baseUrl);
  console.log("Access Token:", accessToken ? "Present" : "Missing");

  return new ApiClient(baseUrl, accessToken);
}
