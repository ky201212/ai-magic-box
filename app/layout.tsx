import type { Metadata, Viewport } from "next";
import { cookies, headers } from "next/headers";
import "./globals.css";
import { LandscapeDesktopStage } from "./_components/landscape-desktop-stage";
import { LandscapeDesktopViewportScript } from "./_components/landscape-desktop-viewport-script";
import { SiteFooter } from "./_components/site-footer";

export const metadata: Metadata = {
  title: "小红车魔法工坊",
  description: "专注青少年人工智能与前沿科技启蒙的多模态创作平台",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
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
  const nonce = (await headers()).get("x-nonce");

  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="flex min-h-full flex-col overflow-x-hidden bg-[#12061f]">
        <LandscapeDesktopViewportScript nonce={nonce} />
        <LandscapeDesktopStage>
          <main className="min-w-0 flex-1">{children}</main>
          <SiteFooter />
        </LandscapeDesktopStage>
      </body>
    </html>
  );
}
