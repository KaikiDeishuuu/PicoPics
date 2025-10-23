import { useState, useEffect, useCallback } from "react";
import type { GlobalState } from "../types";

const initialState: GlobalState = {
  historyRefreshTrigger: 0,
  adminStatsRefreshTrigger: 0,
  fileDeleted: null,
};

let currentState: GlobalState = { ...initialState };
const listeners: Set<() => void> = new Set();

// 更新全局状态
export const updateGlobalState = (updates: Partial<GlobalState>) => {
  currentState = { ...currentState, ...updates };
  notifyListeners();
};

// 获取当前全局状态
export const getGlobalState = () => currentState;

// 通知所有监听器
const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// 主 Hook
export function useGlobalState(): GlobalState {
  const [state, setState] = useState<GlobalState>(currentState);

  const listener = useCallback(() => {
    setState(currentState);
  }, []);

  useEffect(() => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, [listener]);

  return state;
}

// 历史记录刷新 Hook
export function useHistoryRefresh() {
  const { historyRefreshTrigger } = useGlobalState();
  const refreshHistory = useCallback(() => {
    updateGlobalState({ historyRefreshTrigger: historyRefreshTrigger + 1 });
  }, [historyRefreshTrigger]);
  return { refreshTrigger: historyRefreshTrigger, refreshHistory };
}

// Admin 统计数据刷新 Hook
export function useAdminStatsRefresh() {
  const { adminStatsRefreshTrigger } = useGlobalState();
  const refreshAdminStats = useCallback(() => {
    updateGlobalState({ adminStatsRefreshTrigger: adminStatsRefreshTrigger + 1 });
  }, [adminStatsRefreshTrigger]);
  return { refreshTrigger: adminStatsRefreshTrigger, refreshAdminStats };
}

// 文件删除事件 Hook
export function useFileDeleted() {
  const { fileDeleted } = useGlobalState();
  const notifyFileDeleted = useCallback((keys: string[]) => {
    updateGlobalState({ fileDeleted: { keys, timestamp: Date.now() } });
  }, []);
  const clearFileDeleted = useCallback(() => {
    updateGlobalState({ fileDeleted: null });
  }, []);
  return { fileDeleted, notifyFileDeleted, clearFileDeleted };
}
