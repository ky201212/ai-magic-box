import "server-only";
import { getSiteSettingValue } from "@/lib/admin-data";

export type HomeHeroSetting = {
  title: string;
  subtitle: string;
  description: string;
  primaryButtonLabel: string;
  primaryButtonHref: string;
  secondaryBadge: string;
};

export type BrandIdentitySetting = {
  siteName: string;
  tagline: string;
  logoUrl: string;
};

export async function getHomeHeroSetting() {
  return getSiteSettingValue<HomeHeroSetting>("brand.homepage.hero", {
    title: "小红车魔法工坊",
    subtitle: "共同拥抱AI新时代",
    description:
      "把编程、绘画、写作与未来科技体验，变成孩子愿意主动走进去的创造旅程。",
    primaryButtonLabel: "开始第一场创作旅程",
    primaryButtonHref: "/workshop?mode=coding",
    secondaryBadge: "面向孩子的AI创造力启蒙",
  });
}

export async function getBrandIdentitySetting() {
  return getSiteSettingValue<BrandIdentitySetting>("brand.identity", {
    siteName: "小红车魔法工坊",
    tagline: "下一代儿童AI创造力平台",
    logoUrl: "/logo.png",
  });
}
