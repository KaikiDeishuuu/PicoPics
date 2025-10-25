/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages 静态导出模式
  output: "export",
  trailingSlash: true,
  skipTrailingSlashRedirect: true,
  distDir: "out",

  // 环境变量配置
  env: {
    NEXT_PUBLIC_UPLOAD_API:
      process.env.NEXT_PUBLIC_UPLOAD_API ||
      "https://uploader-worker-v2-prod.haoweiw370.workers.dev",
    NEXT_PUBLIC_HISTORY_API:
      process.env.NEXT_PUBLIC_HISTORY_API ||
      "https://history-worker-v2-prod.haoweiw370.workers.dev",
    NEXT_PUBLIC_CDN_BASE:
      process.env.NEXT_PUBLIC_CDN_BASE || "https://cdn-worker-v2-prod.haoweiw370.workers.dev",
  },

  // 图片优化配置
  images: {
    unoptimized: true, // GitHub Pages 不支持 Next.js 图片优化
    domains: [
      "pic.lambdax.me",
      "localhost",
      "uploader-worker-v2-prod.haoweiw370.workers.dev",
      "history-worker-v2-prod.haoweiw370.workers.dev",
      "cdn-worker-v2-prod.haoweiw370.workers.dev",
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

module.exports = nextConfig;
