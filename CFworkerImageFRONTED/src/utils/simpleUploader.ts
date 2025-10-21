/**
 * 简单但高效的图片上传工具
 * 功能：压缩、进度显示、自动重试
 * 不需要后端修改即可使用
 */

import imageCompression from "browser-image-compression";

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

const UPLOAD_API_URL =
  process.env.NEXT_PUBLIC_UPLOAD_API || "http://localhost:8787/upload";
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
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (this.file.size > maxSize) {
      throw new UploadError(`文件过大，最大允许 10MB`, "FILE_TOO_LARGE");
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
          // 压缩进度占 5% - 20%
          this.options.onProgress?.(5 + p * 0.15);
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
        return await this.uploadFile(file, attempt);
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

  private async uploadFile(
    file: File,
    attempt: number
  ): Promise<UploadResponse> {
    const headers: Record<string, string> = {
      "Content-Type": file.type,
    };

    if (this.options.turnstileToken) {
      headers["CF-Turnstile-Token"] = this.options.turnstileToken;
    }

    if (this.options.accessToken) {
      headers["Authorization"] = `Bearer ${this.options.accessToken}`;
    }

    console.log(`Upload attempt ${attempt}...`);
    const startTime = Date.now();

    const response = await fetch(UPLOAD_API_URL, {
      method: "POST",
      headers,
      body: file,
      signal: AbortSignal.timeout(30000), // 30 秒超时
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    console.log(`Upload completed in ${duration}s`);

    const data = (await response.json()) as UploadResponse;

    if (!response.ok) {
      throw new UploadError(
        data.error || `上传失败: ${response.statusText}`,
        data.code || "UPLOAD_FAILED"
      );
    }

    return data;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
