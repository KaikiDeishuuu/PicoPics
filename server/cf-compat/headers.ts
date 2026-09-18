/**
 * The workers read the client IP from the `CF-Connecting-IP` header (set by
 * Cloudflare in front of Workers). Behind Caddy the real IP arrives in
 * X-Forwarded-For; copy it over so abuse detection and Telegram notifications
 * keep working unchanged.
 */
export function withCfConnectingIp(request: Request): Request {
  if (request.headers.get("CF-Connecting-IP")) return request;
  const xff = request.headers.get("X-Forwarded-For");
  if (!xff) return request;
  const ip = xff.split(",")[0]?.trim();
  if (!ip) return request;

  const headers = new Headers(request.headers);
  headers.set("CF-Connecting-IP", ip);
  const hasBody = request.body !== null && request.method !== "GET" && request.method !== "HEAD";
  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (hasBody) {
    init.body = request.body;
    init.duplex = "half";
  }
  return new Request(request.url, init);
}
