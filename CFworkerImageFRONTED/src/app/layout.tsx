import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PicoPics",
  description: "现代化的图片上传和分享平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
