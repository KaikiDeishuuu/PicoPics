/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    appDir: true,
  },
  images: {
    domains: ["avatars.githubusercontent.com"],
    unoptimized: true, // 禁用Next.js图片优化，因为Cloudflare Pages不支持
  },
  output: "export", // 启用静态导出
  trailingSlash: true, // 添加尾斜杠以确保正确的路由
  distDir: "out", // 输出目录
  // 跳过API路由的静态生成
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // 禁用API路由检测
  pageExtensions: ["tsx", "ts", "jsx", "js"],
  // 强制静态生成，忽略API路由
  generateBuildId: async () => {
    return "build-" + Date.now();
  },
};

module.exports = nextConfig;
