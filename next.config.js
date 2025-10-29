const withPWA = require("next-pwa")({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/middleware-manifest\.json$/],
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|gif|webp|svg)$/,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.workers\.dev/,
      handler: "NetworkFirst",
      options: {
        cacheName: "api",
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 5 * 60, // 5 minutes
        },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // 使用 standalone 模式，支持动态渲染（仅生产环境）
  output: process.env.NODE_ENV === "production" ? "standalone" : undefined,

  // 强制动态渲染
  trailingSlash: false,

  // 启用实验性功能
  experimental: {
    serverActions: {
      allowedOrigins: ["localhost:3000", "*.vercel.app", "*.pages.dev"],
    },
  },

  // 严格模式
  reactStrictMode: true,

  // 环境变量配置
  env: {
    NEXT_PUBLIC_UPLOAD_API:
      process.env.NEXT_PUBLIC_UPLOAD_API ||
      "https://your-upload-worker.workers.dev",
    NEXT_PUBLIC_HISTORY_API:
      process.env.NEXT_PUBLIC_HISTORY_API ||
      "https://your-history-worker.workers.dev",
    NEXT_PUBLIC_CDN_BASE:
      process.env.NEXT_PUBLIC_CDN_BASE ||
      "https://your-cdn-worker.workers.dev",
    // Agent 监控配置
    NEXT_PUBLIC_AGENT_API_URL:
      process.env.NEXT_PUBLIC_AGENT_API_URL ||
      "https://your-agent-api.com",
    NEXT_PUBLIC_AGENT_API_KEY:
      process.env.NEXT_PUBLIC_AGENT_API_KEY || "your_agent_api_key_here",
  },

  // 图片优化配置
  images: {
    unoptimized: true, // Cloudflare Pages Functions 不支持 Next.js 图片优化
    domains: [
      "pic.lambdax.me",
      "localhost",
      "your-upload-worker.workers.dev",
      "your-history-worker.workers.dev",
      "your-cdn-worker.workers.dev",
    ],
    formats: ["image/avif", "image/webp"],
  },

  // 编译优化
  compiler: {
    // 移除 console.log（生产环境）
    removeConsole:
      process.env.NODE_ENV === "production"
        ? {
            exclude: ["error", "warn"],
          }
        : false,
  },

  // Webpack 优化
  webpack: (config, { isServer }) => {
    // 代码分割优化
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: "all",
          cacheGroups: {
            default: false,
            vendors: false,
            // 第三方库单独打包
            vendor: {
              name: "vendor",
              chunks: "all",
              test: /node_modules/,
              priority: 20,
              maxSize: 1024 * 500, // 500KB
            },
            // 公共代码
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
              maxSize: 1024 * 500, // 500KB
            },
          },
        },
      };
    }

    return config;
  },
};

// 暂时禁用 PWA 来构建
module.exports = nextConfig;
