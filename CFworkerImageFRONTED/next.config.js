/** @type {import('next').NextConfig} */
const nextConfig = {
  // React 严格模式
  reactStrictMode: true,

  // 使用 SWC 进行压缩（比 Terser 快 7 倍）
  swcMinify: true,

  // 生产环境优化
  compress: true,
  productionBrowserSourceMaps: false,

  // Cloudflare Pages 输出配置
  output: "export",

  // 禁用 x-powered-by 头
  poweredByHeader: false,

  // 环境变量配置
  env: {
    NEXT_PUBLIC_UPLOAD_API:
      process.env.NEXT_PUBLIC_UPLOAD_API ||
      "https://your-worker.workers.dev/upload",
  },

  // 图片优化配置
  images: {
    unoptimized: true, // Cloudflare Pages 不支持 Next.js 图片优化
    domains: ["pic.lambdax.me", "localhost"],
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
            },
            // 公共代码
            common: {
              name: "common",
              minChunks: 2,
              chunks: "all",
              priority: 10,
              reuseExistingChunk: true,
              enforce: true,
            },
          },
        },
      };
    }

    return config;
  },

  // Note: headers(), redirects() and rewrites() are not supported when using
  // `output: 'export'` (static export). Configure security headers for Cloudflare
  // Pages in `wrangler.toml` (we already set them there).
};

module.exports = nextConfig;
