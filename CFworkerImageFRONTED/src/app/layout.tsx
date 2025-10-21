import type { Metadata } from "next";
import "./globals.css";
import ScrollPerf from "@/components/ScrollPerf";

export const metadata: Metadata = {
  title: "Kaiki Image - Cloudflare R2 图床",
  description:
    "基于 Cloudflare Workers + R2 + AI 的安全高速图片上传服务 | Created by Kaiki",
  keywords: [
    "图床",
    "图片上传",
    "Cloudflare",
    "R2",
    "免费图床",
    "Kaiki",
    "AI审核",
  ],
  authors: [{ name: "Kaiki" }],
  creator: "Kaiki",
  openGraph: {
    title: "Kaiki Image - 安全高速图床",
    description: "基于 Cloudflare 技术栈的现代化图床服务",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <link
          rel="icon"
          href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 32 32%22><defs><linearGradient id=%22logoGradient%22 x1=%220%25%22 y1=%220%25%22 x2=%22100%25%22 y2=%22100%25%22><stop offset=%220%25%22 stop-color=%22%23ff6a00%22/><stop offset=%2250%25%22 stop-color=%22%23ff2d95%22/><stop offset=%22100%25%22 stop-color=%22%237c3aed%22/></linearGradient></defs><rect width=%2232%22 height=%2232%22 rx=%226%22 fill=%22url(%23logoGradient)%22 stroke=%22rgba(255,255,255,0.2)%22 stroke-width=%221%22/><text x=%2216%22 y=%2222%22 text-anchor=%22middle%22 fill=%22white%22 font-family=%22Arial,sans-serif%22 font-size=%2218%22 font-weight=%22bold%22>K</text></svg>"
        />
      </head>
      <body className="antialiased">
        <ScrollPerf />
        {children}
      </body>
    </html>
  );
}
