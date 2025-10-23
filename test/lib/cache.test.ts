import { beforeEach, describe, expect, it } from "vitest";
import { CACHE_TAGS, smartCache } from "@/lib/cache";

describe("SmartCache", () => {
  beforeEach(() => {
    smartCache.clear();
  });

  it("should cache and retrieve data", async () => {
    const key = "test-key";
    const data = { message: "test data" };
    const fetcher = vi.fn().mockResolvedValue(data);

    const result = await smartCache.get(key, fetcher);

    expect(result).toEqual(data);
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 第二次调用应该从缓存获取
    const result2 = await smartCache.get(key, fetcher);
    expect(result2).toEqual(data);
    expect(fetcher).toHaveBeenCalledTimes(1); // 不应该再次调用 fetcher
  });

  it("should handle cache expiration", async () => {
    const key = "test-key";
    const data = { message: "test data" };
    const fetcher = vi.fn().mockResolvedValue(data);

    // 设置很短的缓存时间
    await smartCache.get(key, fetcher, { maxAge: 1 });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 等待缓存过期
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 应该重新调用 fetcher
    await smartCache.get(key, fetcher, { maxAge: 1 });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should use stale-while-revalidate", async () => {
    const key = "test-key";
    const data = { message: "test data" };
    const fetcher = vi.fn().mockResolvedValue(data);

    // 设置缓存
    await smartCache.get(key, fetcher, {
      maxAge: 1,
      staleWhileRevalidate: 100,
    });
    expect(fetcher).toHaveBeenCalledTimes(1);

    // 等待缓存过期但仍在 stale 期间
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 应该返回过期数据，同时在后台更新
    const result = await smartCache.get(key, fetcher, {
      maxAge: 1,
      staleWhileRevalidate: 100,
    });
    expect(result).toEqual(data);

    // 等待后台更新完成
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("should invalidate cache by tags", () => {
    const key1 = "key1";
    const key2 = "key2";
    const data = { message: "test" };

    smartCache.set(key1, data, { tags: [CACHE_TAGS.USER_IMAGES] });
    smartCache.set(key2, data, { tags: [CACHE_TAGS.ADMIN_STATS] });

    expect(smartCache.getStats().total).toBe(2);

    smartCache.invalidate([CACHE_TAGS.USER_IMAGES]);

    expect(smartCache.getStats().total).toBe(1);
  });

  it("should provide cache statistics", () => {
    const data = { message: "test" };

    smartCache.set("key1", data, { maxAge: 1000 });
    smartCache.set("key2", data, { maxAge: 1 });

    const stats = smartCache.getStats();
    expect(stats.total).toBe(2);
    expect(stats.valid).toBe(2);
  });
});
