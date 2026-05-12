import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "小红车魔法工坊",
  description: "专注青少年人工智能与前沿科技启蒙的多模态创作平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
