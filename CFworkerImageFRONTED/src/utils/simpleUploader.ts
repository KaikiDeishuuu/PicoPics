/**
 * 简单但高效的图片上传工具
 * 功能：压缩、进度显示、自动重试
 * 不需要后端修改即可使用
 */

import imageCompression from "browser-image-compression";
import { env } from "@/config/env";

export interface SimpleUploaderOptions {
  turnstileToken?: string;
  accessToken?: string; // GitHub access token
  onProgress?: (progress: number) => void;
  onError?: (error: UploadError) => void;
  onSuccess?: (response: UploadResponse) => void;
}

export interface UploadResponse {
  success: boolean;
  error?: string;
  code?: string;
  url?: string;
  fileName?: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

export class UploadError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "UploadError";
    this.code = code;
  }
}

// 使用统一的环境配置
const UPLOAD_API_URL = env.uploadApi;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 秒

export class SimpleUploader {
  private file: File;
  private options: SimpleUploaderOptions;

  constructor(file: File, options: SimpleUploaderOptions) {
    this.file = file;
    this.options = options;
  }

  /**
   * 开始上传流程
   */
  public async start(): Promise<void> {
    try {
      // 1. 验证文件
      this.validateFile();
      this.options.onProgress?.(5);

      // 2. 压缩图片（如果需要）
      const processedFile = await this.compressImageIfNeeded();
      this.options.onProgress?.(20);

      // 3. 上传文件（带自动重试）
      const response = await this.uploadWithRetry(processedFile);

      this.options.onProgress?.(100);
      this.options.onSuccess?.(response);
    } catch (error) {
      const uploadError =
        error instanceof UploadError
          ? error
          : new UploadError(
              error instanceof Error ? error.message : "未知错误",
              "UNKNOWN_ERROR"
            );
      this.options.onError?.(uploadError);
      console.error("Upload failed:", uploadError);
    }
  }

  private validateFile(): void {
    if (!this.file.type.startsWith("image/")) {
      throw new UploadError("只允许上传图片文件", "INVALID_FILE_TYPE");
    }
    const maxSize = env.maxUploadSize;
    if (this.file.size > maxSize) {
      throw new UploadError(
        `文件过大，最大允许 ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
        "FILE_TOO_LARGE"
      );
    }
  }

  private async compressImageIfNeeded(): Promise<File> {
    // 小于 500KB 的图片不压缩
    if (this.file.size < 500 * 1024) {
      return this.file;
    }

    try {
      console.log(
        `Original size: ${(this.file.size / 1024 / 1024).toFixed(2)}MB`
      );

      const options = {
        maxSizeMB: 1.5,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        onProgress: (p: number) => {
          // 压缩进度占 5% - 40%
          const mapped = Math.min(40, Math.round(5 + p * 0.35));
          console.log(`Compression progress: ${p} -> mapped: ${mapped}`);
          this.options.onProgress?.(mapped);
        },
      };

      const compressedFile = await imageCompression(this.file, options);
      console.log(
        `Compressed size: ${(compressedFile.size / 1024 / 1024).toFixed(2)}MB`
      );
      console.log(
        `Compression ratio: ${(
          (1 - compressedFile.size / this.file.size) *
          100
        ).toFixed(1)}%`
      );

      return compressedFile;
    } catch (error) {
      console.warn("Image compression failed, uploading original file.", error);
      return this.file;
    }
  }

  private async uploadWithRetry(file: File): Promise<UploadResponse> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await this.uploadFile(file);
      } catch (error) {
        lastError = error as Error;
        console.warn(`Upload attempt ${attempt} failed:`, error);

        if (attempt < MAX_RETRIES) {
          // 等待后重试
          await this.delay(RETRY_DELAY * attempt);
          this.options.onProgress?.(20 + (attempt / MAX_RETRIES) * 10);
        }
      }
    }

    throw new UploadError(
      `上传失败（已重试 ${MAX_RETRIES} 次）: ${lastError?.message}`,
      "UPLOAD_FAILED"
    );
  }

  private async uploadFile(file: File): Promise<UploadResponse> {
    // Use XMLHttpRequest to provide upload progress events (fetch does not provide upload progress)
    return new Promise<UploadResponse>((resolve, reject) => {
      try {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", UPLOAD_API_URL);

        // Set headers
        if (this.options.turnstileToken) {
          xhr.setRequestHeader(
            "CF-Turnstile-Token",
            this.options.turnstileToken
          );
        }
        if (this.options.accessToken) {
          xhr.setRequestHeader(
            "Authorization",
            `Bearer ${this.options.accessToken}`
          );
        }
        // Don't set Content-Type - FormData will set it automatically with boundary

        // Timeout
        xhr.timeout = env.apiTimeout;

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            // Map upload progress into 20..95 range
            const pct = Math.round((e.loaded / e.total) * 75);
            const mapped = Math.min(95, 20 + pct);
            this.options.onProgress?.(mapped);
          } else {
            // Unknown total, give a mid-progress indication
            this.options.onProgress?.(50);
          }
        };

        xhr.onload = () => {
          try {
            const status = xhr.status;
            const text = xhr.responseText;
            const json = text ? JSON.parse(text) : null;

            if (status >= 200 && status < 300) {
              this.options.onProgress?.(100);
              resolve(json as UploadResponse);
            } else {
              const errMsg =
                (json && json.error) || xhr.statusText || `HTTP ${status}`;
              reject(new UploadError(errMsg, json?.code || "UPLOAD_FAILED"));
            }
          } catch (err) {
            console.error("Upload parse error:", err);
            reject(
              new UploadError(
                "Invalid response from server",
                "INVALID_RESPONSE"
              )
            );
          }
        };

        xhr.onerror = () =>
          reject(
            new UploadError("Network error during upload", "NETWORK_ERROR")
          );
        xhr.ontimeout = () =>
          reject(new UploadError("Upload timeout", "TIMEOUT"));

        // Create FormData and append the file
        const formData = new FormData();
        formData.append("image", file);

        xhr.send(formData);
      } catch (err) {
        reject(err instanceof Error ? err : new Error("Unknown upload error"));
      }
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
