import { z } from "zod";
import { ErrorResponse, errors } from "./errors";

// File upload with progress tracking (client-side only)
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

// Client-side fetch wrapper
export async function clientFetch<T extends z.ZodType>(
  url: string,
  options: RequestInit = {},
  responseSchema?: T
): Promise<z.infer<T>> {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      if (response.status === 413) {
        throw errors.fileTooLarge(10);
      }

      if (response.status === 415) {
        throw errors.invalidFileType([
          "image/jpeg",
          "image/png",
          "image/gif",
          "image/webp",
        ]);
      }

      if (response.status === 429) {
        throw errors.rateLimitExceeded();
      }

      if (response.status === 401) {
        throw errors.unauthorized();
      }

      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Check for error response
    if (data && typeof data === "object" && data.success === false) {
      const errorResponse = data as ErrorResponse;
      throw new Error(`API Error: ${errorResponse.message}`);
    }

    // Validate response if schema provided
    if (responseSchema) {
      return responseSchema.parse(data);
    }

    return data;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw errors.validation("响应数据格式错误", error.errors);
    }

    throw error;
  }
}
