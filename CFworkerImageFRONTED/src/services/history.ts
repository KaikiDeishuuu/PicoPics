/**
 * 历史记录 API 服务
 */

import type { ImageHistoryRecord } from "@/types";
import { env } from "@/config/env";

const HISTORY_API_URL = env.historyApi;

/**
 * 获取用户的历史记录
 *
 * @param accessToken GitHub 访问令牌
 * @returns 历史记录列表
 */
export async function getUserHistory(accessToken: string): Promise<{
  success: boolean;
  data?: ImageHistoryRecord[];
  error?: string;
}> {
  try {
    const response = await fetch(`${HISTORY_API_URL}/api/history`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `获取历史记录失败: ${response.statusText}`,
      };
    }

    return {
      success: true,
      data: data.data || [],
    };
  } catch (error) {
    console.error("Get history error:", error);

    // 处理不同类型的错误
    if (error instanceof Error) {
      if (error.message.includes("fetch")) {
        return {
          success: false,
          error: "网络错误，无法连接到服务器",
        };
      }

      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "未知错误",
    };
  }
}

/**
 * 生成图片的完整 URL
 *
 * @param r2ObjectKey R2 对象键
 * @returns 完整的图片 URL
 */
export function getImageUrl(r2ObjectKey: string): string {
  return `${env.cdnUrl}/${r2ObjectKey}`;
}
