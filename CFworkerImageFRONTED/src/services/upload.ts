/**
 * 图片上传 API 服务
 */

import type { UploadResponse } from "@/types";
import { env } from "@/config/env";

const UPLOAD_API_URL = env.uploadApi;

/**
 * 上传图片到后端 Worker
 *
 * @param file 要上传的图片文件
 * @param turnstileToken Cloudflare Turnstile 验证 token（可选）
 * @returns 上传结果
 */
export async function uploadImage(
  file: File,
  turnstileToken?: string
): Promise<UploadResponse> {
  try {
    // 验证文件类型
    if (!file.type.startsWith("image/")) {
      return {
        success: false,
        error: "只允许上传图片文件",
        code: "INVALID_FILE_TYPE",
      };
    }

    // 验证文件大小（10MB）
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        success: false,
        error: `文件过大，最大允许 ${(maxSize / 1024 / 1024).toFixed(1)}MB`,
        code: "FILE_TOO_LARGE",
      };
    }

    // 准备请求头
    const headers: Record<string, string> = {
      "Content-Type": file.type,
    };

    // 如果有 Turnstile token，添加到请求头
    if (turnstileToken) {
      headers["CF-Turnstile-Token"] = turnstileToken;
    }

    // 使用原生 fetch（比 axios 更快）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(UPLOAD_API_URL, {
      method: "POST",
      headers,
      body: file,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // 解析响应
    const data = (await response.json()) as UploadResponse;

    if (!response.ok) {
      return (
        data || {
          success: false,
          error: `上传失败: ${response.statusText}`,
          code: "UPLOAD_FAILED",
        }
      );
    }

    return data;
  } catch (error) {
    console.error("Upload error:", error);

    // 处理不同类型的错误
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          error: "上传超时，请检查网络连接",
          code: "TIMEOUT",
        };
      }

      if (error.message.includes("fetch")) {
        return {
          success: false,
          error: "网络错误，无法连接到服务器",
          code: "NETWORK_ERROR",
        };
      }

      return {
        success: false,
        error: error.message,
        code: "UNKNOWN_ERROR",
      };
    }

    return {
      success: false,
      error: "未知错误",
      code: "UNKNOWN_ERROR",
    };
  }
}

/**
 * 生成不同格式的链接
 *
 * @param url 图片 URL
 * @param fileName 文件名（可选）
 * @returns 各种格式的链接
 */
export function generateLinkFormats(
  url: string,
  fileName?: string
): {
  url: string;
  html: string;
  htmlSimple: string;
  markdown: string;
  bbcode: string;
  markdownWithLink: string;
} {
  const safeUrl = url.trim();

  // 从完整文件名中提取基础名称（去掉扩展名）作为 alt 文本
  // 例如: "1729518234567-1jF2quri2W3uxc7oBBwjcBewAZVBlfST.webp" -> "1jF2quri2W3uxc7oBBwjcBewAZVBlfST"
  let altText = "image";
  if (fileName) {
    // 移除扩展名
    const nameWithoutExt = fileName.replace(/\.[^.]+$/, "");
    // 如果有时间戳前缀（格式：timestamp-name），提取名称部分
    const parts = nameWithoutExt.split("-");
    if (parts.length > 1 && /^\d+$/.test(parts[0])) {
      // 第一部分是纯数字（时间戳），使用后面的部分
      altText = parts.slice(1).join("-");
    } else {
      altText = nameWithoutExt;
    }
  }

  const normalizedAlt = altText.replace(/\s+/g, " ").trim() || "image";
  const htmlAlt = normalizedAlt
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  const markdownAlt = normalizedAlt
    .replace(/\\/g, "\\\\")
    .replace(/\[/g, "\\[")
    .replace(/]/g, "\\]")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
  const markdownUrl = safeUrl
    .replace(/\s/g, "%20")
    .replace(/\(/g, "%28")
    .replace(/\)/g, "%29");

  return {
    // 1. 直接 URL
    url: safeUrl,

    // 2. HTML（带 alt）
    html: `<img src="${safeUrl}" alt="${htmlAlt}">`,

    // 3. HTML（简化版，无 alt）
    htmlSimple: `<img src="${safeUrl}">`,

    // 4. Markdown
    markdown: `![${markdownAlt}](${markdownUrl})`,

    // 5. BBCode
    bbcode: `[img]${safeUrl}[/img]`,

    // 6. Markdown with Link（可点击的图片）
    markdownWithLink: `[![${markdownAlt}](${markdownUrl})](${markdownUrl})`,
  };
}
