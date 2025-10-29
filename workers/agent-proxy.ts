// Agent Proxy Worker - Enhanced Version
// 增强版Agent代理Worker

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number;
}

// 简单的内存缓存
const cache = new Map<string, CacheEntry>();

// 缓存配置
const CACHE_TTL = {
  agents: 30 * 1000, // 30秒
  hosts: 15 * 1000, // 15秒
  health: 10 * 1000, // 10秒
  stats: 60 * 1000, // 60秒
  default: 5 * 1000, // 5秒
};

// 获取缓存TTL
function getCacheTTL(path: string): number {
  if (path.includes("/agents")) return CACHE_TTL.agents;
  if (path.includes("/hosts")) return CACHE_TTL.hosts;
  if (path.includes("/health")) return CACHE_TTL.health;
  if (path.includes("/stats")) return CACHE_TTL.stats;
  return CACHE_TTL.default;
}

// 检查缓存是否有效
function isCacheValid(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < entry.ttl;
}

// 清理过期缓存
function cleanExpiredCache(): void {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now - entry.timestamp >= entry.ttl) {
      cache.delete(key);
    }
  }
}

// 日志函数
function log(level: string, message: string, data?: any): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`, data || "");
}

// 获取CORS头
function getCorsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Expose-Headers":
      "Content-Length, Content-Type, X-Cache-Status, X-Response-Time",
    "Access-Control-Max-Age": "86400",
  };
}

export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const startTime = Date.now();
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // 清理过期缓存
    cleanExpiredCache();

    log("INFO", `Request: ${method} ${path}`);

    // EdgeOne CDN检测和日志
    const edgeOneHeaders = {
      "CF-Connecting-IP":
        request.headers.get("cf-connecting-ip") ||
        request.headers.get("CF-Connecting-IP"),
      "EO-Client-IP":
        request.headers.get("eo-client-ip") ||
        request.headers.get("EO-Client-IP"),
      "EO-Client-IPCountry":
        request.headers.get("eo-client-ipcountry") ||
        request.headers.get("EO-Client-IPCountry"),
    };

    const hasEdgeOneHeaders = Object.values(edgeOneHeaders).some(
      (value) => value !== null
    );
    if (hasEdgeOneHeaders) {
      log("INFO", "EdgeOne CDN detected", edgeOneHeaders);
    }

    // 处理 CORS 预检请求
    if (method === "OPTIONS") {
      return new Response(null, {
        status: 200,
        headers: getCorsHeaders(),
      });
    }

    // 检查API Key
    const apiKey = env.AGENT_API_KEY || process.env.AGENT_API_KEY;
    if (!apiKey) {
      log("ERROR", "API Key not configured");
      return new Response(JSON.stringify({ error: "API Key not configured" }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCorsHeaders(),
        },
      });
    }

    // 构建目标URL - 指向ag1nt.lambdax.me的增强版接收器（通过Nginx反代443端口）
    const agentUrl = `https://ag1nt.lambdax.me${path}${url.search}`;

    // 检查缓存（仅对GET请求）
    if (method === "GET") {
      const cacheKey = `${path}${url.search}`;
      const cached = cache.get(cacheKey);

      if (cached && isCacheValid(cached)) {
        log("INFO", `Cache hit for ${path}`);
        return new Response(JSON.stringify(cached.data), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-Cache-Status": "HIT",
            ...getCorsHeaders(),
          },
        });
      }
    }

    // 创建新的请求头
    const headers = new Headers(request.headers);
    headers.set("X-API-Key", apiKey);
    headers.set("User-Agent", "Agent-Proxy-Worker/2.0");

    // EdgeOne CDN真实IP传递支持
    // 使用自定义头避免Cloudflare Worker限制
    const cfConnectingIP =
      request.headers.get("cf-connecting-ip") ||
      request.headers.get("CF-Connecting-IP");
    const eoClientIP =
      request.headers.get("eo-client-ip") ||
      request.headers.get("EO-Client-IP");
    const eoClientIPCountry =
      request.headers.get("eo-client-ipcountry") ||
      request.headers.get("EO-Client-IPCountry");

    // 使用自定义头传递EdgeOne信息，避免Cloudflare限制
    if (cfConnectingIP) {
      headers.set("X-Real-IP", cfConnectingIP); // 使用X-Real-IP传递真实IP
      headers.set("X-EdgeOne-IP", cfConnectingIP); // 自定义头标识EdgeOne IP
      log("INFO", `Passing EdgeOne IP as X-Real-IP: ${cfConnectingIP}`);
    }

    if (eoClientIP) {
      headers.set("X-EdgeOne-Client-IP", eoClientIP);
      log("INFO", `Passing EO-Client-IP: ${eoClientIP}`);
    }

    if (eoClientIPCountry) {
      headers.set("X-EdgeOne-Country", eoClientIPCountry);
      log("INFO", `Passing EO-Client-IPCountry: ${eoClientIPCountry}`);
    }

    // 如果检测到EdgeOne头，添加特殊标识
    if (cfConnectingIP || eoClientIP || eoClientIPCountry) {
      headers.set("X-EdgeOne-Detected", "true");
      log("INFO", "EdgeOne CDN detected and headers processed");
    }

    // 传递其他真实IP头
    const xRealIP = request.headers.get("X-Real-IP");
    const xForwardedFor = request.headers.get("X-Forwarded-For");

    if (xRealIP) {
      headers.set("X-Real-IP", xRealIP);
    }

    if (xForwardedFor) {
      headers.set("X-Forwarded-For", xForwardedFor);
    }

    try {
      log("INFO", `Forwarding to: ${agentUrl}`);

      // 转发请求到增强版Agent接收器
      const response = await fetch(agentUrl, {
        method: method,
        headers: headers,
        body: request.body,
        // 添加超时
        signal: AbortSignal.timeout(30000), // 30秒超时
      });

      const responseTime = Date.now() - startTime;
      log("INFO", `Response: ${response.status} (${responseTime}ms)`);

      // 读取响应体
      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      // 缓存GET请求的响应
      if (method === "GET" && response.ok) {
        const cacheKey = `${path}${url.search}`;
        const ttl = getCacheTTL(path);
        cache.set(cacheKey, {
          data: responseData,
          timestamp: Date.now(),
          ttl: ttl,
        });
        log("INFO", `Cached response for ${path} (TTL: ${ttl}ms)`);
      }

      // 添加 CORS 头和缓存状态
      const newResponse = new Response(JSON.stringify(responseData), {
        status: response.status,
        statusText: response.statusText,
        headers: {
          "Content-Type": "application/json",
          "X-Cache-Status": method === "GET" ? "MISS" : "N/A",
          "X-Response-Time": `${responseTime}ms`,
          ...getCorsHeaders(),
        },
      });

      return newResponse;
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      log("ERROR", `Proxy error: ${error.message}`, {
        path,
        method,
        responseTime,
        errorType: error.name,
      });

      // 根据错误类型返回不同的状态码
      let status = 500;
      let errorMessage = "Agent proxy error";

      if (error.name === "TimeoutError") {
        status = 504;
        errorMessage = "Gateway timeout";
      } else if (error.message.includes("fetch")) {
        status = 502;
        errorMessage = "Bad gateway";
      }

      return new Response(
        JSON.stringify({
          error: errorMessage,
          details: error.message,
          timestamp: new Date().toISOString(),
          path: path,
          method: method,
        }),
        {
          status: status,
          headers: {
            "Content-Type": "application/json",
            "X-Response-Time": `${responseTime}ms`,
            ...getCorsHeaders(),
          },
        }
      );
    }
  },
};
