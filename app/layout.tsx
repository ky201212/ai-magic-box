import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";

export const metadata: Metadata = {
  title: "小红车魔法工坊",
  description: "专注青少年人工智能与前沿科技启蒙的多模态创作平台",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await cookies();

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col overflow-x-hidden bg-[#12061f]">
        <main className="min-w-0 flex-1">{children}</main>
      </body>
    </html>
  );
}
