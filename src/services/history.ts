import type { ImageHistoryRecord } from "../types";
import { env } from "../config/env";

const HISTORY_API_URL = env.historyApi;

// 获取用户历史记录
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

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return { success: true, data };
  } catch (error) {
    console.error("Get user history error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "获取历史记录失败",
    };
  }
}

// 获取图片 URL
export function getImageUrl(r2ObjectKey: string): string {
  return `${env.cdnUrl}/${r2ObjectKey}`;
}
