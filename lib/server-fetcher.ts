import got from "got";
import { z } from "zod";
import { createError, type ErrorResponse } from "./errors";

// Base fetcher configuration for server-side only
const createFetcher = () => {
  // Check if we're in Node.js environment
  if (typeof window !== "undefined") {
    throw new Error("fetcher is only available in server-side code");
  }

  return got.extend({
    timeout: {
      request: 30000, // 30 seconds
    },
    retry: {
      limit: 2,
      methods: ["GET", "POST", "PUT", "DELETE"],
    },
    headers: {
      "User-Agent": "PicoPics/2.0.0",
    },
  });
};

// Generic fetcher function with Zod validation
export async function fetcher<T extends z.ZodType>(
  url: string,
  options: Record<string, unknown> = {},
  responseSchema?: T
): Promise<z.infer<T>> {
  const gotInstance = createFetcher();

  try {
    const response = await gotInstance(url, {
      ...options,
      responseType: "json",
    });

    const data = response.body as Record<string, unknown>;

    // Check for error response
    if (data && typeof data === "object" && data.success === false) {
      const errorResponse = data as unknown as ErrorResponse;
      throw new Error(`API Error: ${errorResponse.message}`);
    }

    // Validate response if schema provided
    if (responseSchema) {
      return responseSchema.parse(data);
    }

    return data;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      throw createError.validationError("响应数据格式错误");
    }

    // Handle different error types
    const err = error as Record<string, unknown>;
    if (err?.name === "HTTPError") {
      const statusCode = ((err?.response as Record<string, unknown>)?.statusCode as number) || 500;
      const responseBody = (err?.response as Record<string, unknown>)?.body as Record<
        string,
        unknown
      >;

      if (statusCode === 413) {
        throw createError.fileTooLarge(10);
      }

      if (statusCode === 415) {
        throw createError.invalidFileType(["image/jpeg", "image/png", "image/gif", "image/webp"]);
      }

      if (statusCode === 429) {
        throw createError.quotaExceeded();
      }

      if (statusCode === 401) {
        throw createError.unauthorized();
      }

      if (responseBody && typeof responseBody === "object" && responseBody.success === false) {
        const message =
          typeof responseBody.message === "string" ? responseBody.message : "请求失败";
        throw new Error(message);
      }

      const message = typeof err.message === "string" ? err.message : "Unknown error";
      throw new Error(`HTTP ${statusCode}: ${message}`);
    }

    if (err?.name === "TimeoutError") {
      throw new Error("请求超时，请检查网络连接");
    }

    if (err?.name === "RequestError") {
      throw new Error("网络请求失败，请检查网络连接");
    }

    throw error;
  }
}

// Specialized fetchers for different HTTP methods
export const api = {
  get: <T extends z.ZodType>(url: string, schema?: T, options: Record<string, unknown> = {}) =>
    fetcher(url, { method: "GET", ...options }, schema),

  post: <T extends z.ZodType>(
    url: string,
    data?: unknown,
    schema?: T,
    options: Record<string, unknown> = {}
  ) =>
    fetcher(
      url,
      {
        method: "POST",
        json: data,
        ...options,
      },
      schema
    ),

  put: <T extends z.ZodType>(
    url: string,
    data?: unknown,
    schema?: T,
    options: Record<string, unknown> = {}
  ) =>
    fetcher(
      url,
      {
        method: "PUT",
        json: data,
        ...options,
      },
      schema
    ),

  delete: <T extends z.ZodType>(url: string, schema?: T, options: Record<string, unknown> = {}) =>
    fetcher(url, { method: "DELETE", ...options }, schema),

  upload: <T extends z.ZodType>(
    url: string,
    formData: FormData,
    schema?: T,
    options: Record<string, unknown> = {}
  ) =>
    fetcher(
      url,
      {
        method: "POST",
        body: formData,
        ...options,
      },
      schema
    ),
};

// File upload with progress tracking
export async function uploadFile(
  url: string,
  file: File,
  onProgress?: (progress: number) => void
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && onProgress) {
        const progress = (event.loaded / event.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error("Invalid JSON response"));
        }
      } else {
        try {
          const errorResponse = JSON.parse(xhr.responseText);
          reject(new Error(errorResponse.message || "Upload failed"));
        } catch {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      }
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.addEventListener("abort", () => {
      reject(new Error("Upload aborted"));
    });

    xhr.open("POST", url);
    xhr.setRequestHeader("Accept", "application/json");

    const formData = new FormData();
    formData.append("file", file);

    xhr.send(formData);
  });
}
