/**
 * 简单的图片上传器
 * 支持压缩、进度跟踪和错误处理
 */

import imageCompression from "browser-image-compression";

interface SimpleUploaderOptions {
  accessToken?: string;
  onProgress?: (progress: number) => void;
  onSuccess?: (response: UploadResponse) => void;
  onError?: (error: Error) => void;
}

interface UploadResponse {
  success: boolean;
  url?: string;
  fileName?: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
  error?: string;
}

export class SimpleUploader {
  private file: File;
  private options: SimpleUploaderOptions;

  constructor(file: File, options: SimpleUploaderOptions = {}) {
    this.file = file;
    this.options = options;
  }

  async start(): Promise<UploadResponse> {
    try {
      // 压缩图片
      this.options.onProgress?.(10);
      const compressedFile = await this.compressImage(this.file);
      this.options.onProgress?.(30);

      // 上传到服务器
      const response = await this.uploadToServer(compressedFile);
      this.options.onProgress?.(100);

      this.options.onSuccess?.(response);
      return response;
    } catch (error) {
      const uploadError =
        error instanceof Error ? error : new Error("上传失败");
      this.options.onError?.(uploadError);

      return {
        success: false,
        error: uploadError.message,
      };
    }
  }

  private async compressImage(file: File): Promise<File> {
    // 如果文件小于1MB，不压缩
    if (file.size < 1024 * 1024) {
      return file;
    }

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      preserveExif: false,
    };

    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.warn("图片压缩失败，使用原图:", error);
      return file;
    }
  }

  private async uploadToServer(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const headers: Record<string, string> = {};

    // 如果有访问令牌，添加到请求头
    if (this.options.accessToken) {
      headers["Authorization"] = `Bearer ${this.options.accessToken}`;
    }

    const uploadApiUrl = process.env.NEXT_PUBLIC_UPLOAD_API || "/api/upload";
    const response = await fetch(uploadApiUrl, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`上传失败: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "上传失败");
    }

    return {
      success: true,
      url: result.url,
      fileName: result.fileName || file.name,
      size: result.size || file.size,
      type: result.type || file.type,
      uploadedAt: result.uploadedAt || new Date().toISOString(),
    };
  }
}
