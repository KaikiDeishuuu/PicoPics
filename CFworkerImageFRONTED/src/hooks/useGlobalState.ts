/**
 * 全局状态管理 Hook
 * 用于跨组件状态同步
 */

import { useState, useEffect, useCallback } from "react";

interface GlobalState {
  // 历史记录刷新触发器
  historyRefreshTrigger: number;
  // Admin 统计数据刷新触发器
  adminStatsRefreshTrigger: number;
  // 文件删除事件
  fileDeleted: {
    keys: string[];
    timestamp: number;
  } | null;
}

// 全局状态存储
let globalState: GlobalState = {
  historyRefreshTrigger: 0,
  adminStatsRefreshTrigger: 0,
  fileDeleted: null,
};

// 状态监听器
const listeners = new Set<() => void>();

// 通知所有监听器
const notifyListeners = () => {
  listeners.forEach((listener) => listener());
};

// 更新全局状态
export const updateGlobalState = (updates: Partial<GlobalState>) => {
  globalState = { ...globalState, ...updates };
  notifyListeners();
};

// 获取当前全局状态
export const getGlobalState = () => globalState;

/**
 * 全局状态 Hook
 */
export function useGlobalState() {
  const [state, setState] = useState<GlobalState>(globalState);

  useEffect(() => {
    const listener = () => {
      setState({ ...globalState });
    };

    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return state;
}

/**
 * 历史记录刷新 Hook
 */
export function useHistoryRefresh() {
  const { historyRefreshTrigger } = useGlobalState();

  const refreshHistory = useCallback(() => {
    updateGlobalState({
      historyRefreshTrigger: globalState.historyRefreshTrigger + 1,
    });
  }, []);

  return {
    refreshTrigger: historyRefreshTrigger,
    refreshHistory,
  };
}

/**
 * Admin 统计数据刷新 Hook
 */
export function useAdminStatsRefresh() {
  const { adminStatsRefreshTrigger } = useGlobalState();

  const refreshAdminStats = useCallback(() => {
    updateGlobalState({
      adminStatsRefreshTrigger: globalState.adminStatsRefreshTrigger + 1,
    });
  }, []);

  return {
    refreshTrigger: adminStatsRefreshTrigger,
    refreshAdminStats,
  };
}

/**
 * 文件删除事件 Hook
 */
export function useFileDeleted() {
  const { fileDeleted } = useGlobalState();

  const notifyFileDeleted = useCallback((keys: string[]) => {
    updateGlobalState({
      fileDeleted: {
        keys,
        timestamp: Date.now(),
      },
    });
  }, []);

  const clearFileDeleted = useCallback(() => {
    updateGlobalState({
      fileDeleted: null,
    });
  }, []);

  return {
    fileDeleted,
    notifyFileDeleted,
    clearFileDeleted,
  };
}
