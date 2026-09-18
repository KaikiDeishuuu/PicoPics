interface CacheEntry {
  response: Response;
  expiresAt: number;
}

const MAX_ENTRIES = 200;

class CacheDefault {
  private readonly store = new Map<string, CacheEntry>();

  async match(request: Request): Promise<Response | undefined> {
    const hit = this.store.get(request.url);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.store.delete(request.url);
      return undefined;
    }
    return hit.response.clone();
  }

  async put(request: Request, response: Response): Promise<void> {
    const cacheControl = response.headers.get("Cache-Control") ?? "";
    const maxAge = /max-age=(\d+)/i.exec(cacheControl);
    const ttlMs = maxAge ? Number(maxAge[1]) * 1000 : 60_000;
    if (ttlMs <= 0) return;
    if (this.store.size >= MAX_ENTRIES) {
      // Map preserves insertion order — evict the oldest entry.
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(request.url, { response: response.clone(), expiresAt: Date.now() + ttlMs });
  }
}

/**
 * workers/uploader.ts caches GitHub token verifications in caches.default
 * (60s TTL). Node has no CacheStorage — install this minimal shim before the
 * worker modules handle any request. The global type comes from
 * @cloudflare/workers-types; assignment is unchecked so the shim's simpler
 * shape is accepted.
 */
export function installCachesShim(): void {
  if (!globalThis.caches) {
    (globalThis as Record<string, unknown>).caches = { default: new CacheDefault() };
  }
}
