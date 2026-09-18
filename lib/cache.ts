// 智能缓存层 - 使用 Cache API 和 stale-while-revalidate 策略

interface CacheOptions {
  maxAge?: number; // 缓存时间（毫秒）
  staleWhileRevalidate?: number; // 过期后仍可使用的时间（毫秒）
  tags?: string[]; // 缓存标签，用于批量失效
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  maxAge: number;
  staleWhileRevalidate: number;
  tags: string[];
}

class SmartCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private maxSize = 100; // 最大缓存条目数

  async get<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}): Promise<T> {
    const entry = this.cache.get(key);
    const now = Date.now();

    // Cache hit and fresh
    if (entry && now - entry.timestamp < entry.maxAge) {
      return entry.data as T;
    }

    // Stale-while-revalidate window: return stale, refresh in background
    if (entry && now - entry.timestamp < entry.staleWhileRevalidate) {
      this.updateInBackground(key, fetcher, options);
      return entry.data as T;
    }

    // Miss / expired
    return this.fetchAndCache(key, fetcher, options);
  }

  private async fetchAndCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    try {
      const data = await fetcher();
      this.set(key, data, options);
      return data;
    } catch (error) {
      // 如果获取失败，尝试返回过期缓存
      const entry = this.cache.get(key);
      if (entry) {
        console.warn(`Cache miss for ${key}, returning stale data`);
        return entry.data as T;
      }
      throw error;
    }
  }

  private async updateInBackground<T>(
    key: string,
    fetcher: () => Promise<T>,
    options: CacheOptions
  ): Promise<void> {
    try {
      const data = await fetcher();
      this.set(key, data, options);
    } catch (error) {
      console.warn(`Background update failed for ${key}:`, error);
    }
  }

  set<T>(key: string, data: T, options: CacheOptions = {}): void {
    const { maxAge = 5 * 60 * 1000, staleWhileRevalidate = 10 * 60 * 1000, tags = [] } = options;

    // 如果缓存已满，删除最旧的条目
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      maxAge,
      staleWhileRevalidate,
      tags,
    });
  }

  invalidate(tags: string[]): void {
    const entries = Array.from(this.cache.entries());
    for (const [key, entry] of entries) {
      if (tags.some((tag) => entry.tags.includes(tag))) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }

  // 获取缓存统计信息
  getStats() {
    const now = Date.now();
    let valid = 0;
    let stale = 0;
    let expired = 0;

    const values = Array.from(this.cache.values());
    for (const entry of values) {
      const age = now - entry.timestamp;
      if (age < entry.maxAge) {
        valid++;
      } else if (age < entry.staleWhileRevalidate) {
        stale++;
      } else {
        expired++;
      }
    }

    return {
      total: this.cache.size,
      valid,
      stale,
      expired,
    };
  }
}

// 全局缓存实例
export const smartCache = new SmartCache();

import { useEffect, useRef, useState } from "react";

// React Hook for cache
export function useCache<T>(key: string, fetcher: () => Promise<T>, options: CacheOptions = {}) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Stabilize fetcher and options across renders — callers commonly pass fresh
  // identities each render, which would otherwise re-run the effect every render.
  const fetcherRef = useRef(fetcher);
  const optionsRef = useRef(options);
  useEffect(() => {
    fetcherRef.current = fetcher;
    optionsRef.current = options;
  });

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const result = await smartCache.get(key, fetcherRef.current, optionsRef.current);

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error("Unknown error"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [key]);

  return { data, loading, error };
}

// 缓存标签常量
export const CACHE_TAGS = {
  USER_IMAGES: "user-images",
  ADMIN_STATS: "admin-stats",
  USER_QUOTA: "user-quota",
} as const;
