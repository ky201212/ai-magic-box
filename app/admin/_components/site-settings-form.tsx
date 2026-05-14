"use client";

import { useMemo, useState } from "react";
import type { SiteSettingRecord } from "./types";

type SaveStatus = "idle" | "saving" | "success" | "error";

type SiteSettingsFormProps = {
  initialSettings: SiteSettingRecord[];
};

type SiteFormState = {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  heroButtonText: string;
  heroButtonHref: string;
  heroBadgeText: string;
  brandName: string;
  brandTagline: string;
  logoUrl: string;
  brandSummaryTitle: string;
  brandSummaryHighlight: string;
  brandSummaryDescription: string;
  initialCredits: number;
};

function getSettingValue<T extends Record<string, unknown>>(
  settings: SiteSettingRecord[],
  key: string,
  fallback: T,
) {
  const record = settings.find((item) => item.setting_key === key);
  return (record?.value as T | undefined) ?? fallback;
}

function createInitialState(settings: SiteSettingRecord[]): SiteFormState {
  const hero = getSettingValue(settings, "brand.homepage.hero", {
    title: "",
    subtitle: "",
    description: "",
    primaryButtonLabel: "",
    primaryButtonHref: "",
    secondaryBadge: "",
  });
  const brand = getSettingValue(settings, "brand.identity", {
    siteName: "",
    tagline: "",
    logoUrl: "",
  });
  const summary = getSettingValue(settings, "brand.page.summary", {
    title: "",
    highlight: "",
    description: "",
  });
  const credits = getSettingValue(settings, "credits.policy", {
    initialCredits: 50,
  });

  return {
    heroTitle: String(hero.title ?? ""),
    heroSubtitle: String(hero.subtitle ?? ""),
    heroDescription: String(hero.description ?? ""),
    heroButtonText: String(hero.primaryButtonLabel ?? ""),
    heroButtonHref: String(hero.primaryButtonHref ?? ""),
    heroBadgeText: String(hero.secondaryBadge ?? ""),
    brandName: String(brand.siteName ?? ""),
    brandTagline: String(brand.tagline ?? ""),
    logoUrl: String(brand.logoUrl ?? ""),
    brandSummaryTitle: String(summary.title ?? ""),
    brandSummaryHighlight: String(summary.highlight ?? ""),
    brandSummaryDescription: String(summary.description ?? ""),
    initialCredits: Number(credits.initialCredits ?? 50),
  };
}

export function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const [formState, setFormState] = useState(() => createInitialState(initialSettings));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const settingMap = useMemo(() => {
    return new Map(initialSettings.map((item) => [item.setting_key, item]));
  }, [initialSettings]);

  const handleFieldChange = (field: keyof SiteFormState, value: string | number) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    setSaveStatus("saving");

    const payload = [
      {
        setting_key: "brand.homepage.hero",
        setting_group: settingMap.get("brand.homepage.hero")?.setting_group ?? "homepage",
        label: settingMap.get("brand.homepage.hero")?.label ?? "首页首屏",
        description:
          settingMap.get("brand.homepage.hero")?.description ?? "首页首屏标题、副标题和按钮文案",
        value: {
          title: formState.heroTitle,
          subtitle: formState.heroSubtitle,
          description: formState.heroDescription,
          primaryButtonLabel: formState.heroButtonText,
          primaryButtonHref: formState.heroButtonHref,
          secondaryBadge: formState.heroBadgeText,
        },
      },
      {
        setting_key: "brand.identity",
        setting_group: settingMap.get("brand.identity")?.setting_group ?? "brand",
        label: settingMap.get("brand.identity")?.label ?? "品牌基础信息",
        description:
          settingMap.get("brand.identity")?.description ?? "站点名称、标语和 Logo 地址",
        value: {
          siteName: formState.brandName,
          tagline: formState.brandTagline,
          logoUrl: formState.logoUrl,
        },
      },
      {
        setting_key: "brand.page.summary",
        setting_group: settingMap.get("brand.page.summary")?.setting_group ?? "brand",
        label: settingMap.get("brand.page.summary")?.label ?? "品牌页摘要",
        description:
          settingMap.get("brand.page.summary")?.description ?? "品牌页头图文案",
        value: {
          title: formState.brandSummaryTitle,
          highlight: formState.brandSummaryHighlight,
          description: formState.brandSummaryDescription,
        },
      },
      {
        setting_key: "credits.policy",
        setting_group: settingMap.get("credits.policy")?.setting_group ?? "credits",
        label: settingMap.get("credits.policy")?.label ?? "魔法币策略",
        description:
          settingMap.get("credits.policy")?.description ?? "新用户初始赠送的魔法币数量",
        value: {
          initialCredits: Math.max(0, Number(formState.initialCredits) || 0),
        },
      },
    ];

    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: payload }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    } finally {
      window.setTimeout(() => {
        setSaveStatus("idle");
      }, 2200);
    }
  };

  return (
    <div className="space-y-5">
      <section className="grid gap-5 xl:grid-cols-2">
        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">首页首屏文案</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            这里的内容会直接影响官网第一屏的展示。
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-600">
              主标题
              <input
                value={formState.heroTitle}
                onChange={(event) => handleFieldChange("heroTitle", event.target.value)}
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              副标题
              <input
                value={formState.heroSubtitle}
                onChange={(event) => handleFieldChange("heroSubtitle", event.target.value)}
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              首屏简介
              <textarea
                value={formState.heroDescription}
                onChange={(event) => handleFieldChange("heroDescription", event.target.value)}
                className="mt-2 h-32 w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none"
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-bold text-slate-600">
                主按钮文案
                <input
                  value={formState.heroButtonText}
                  onChange={(event) => handleFieldChange("heroButtonText", event.target.value)}
                  className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                />
              </label>
              <label className="block text-sm font-bold text-slate-600">
                主按钮跳转
                <input
                  value={formState.heroButtonHref}
                  onChange={(event) => handleFieldChange("heroButtonHref", event.target.value)}
                  className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                />
              </label>
            </div>
            <label className="block text-sm font-bold text-slate-600">
              徽章提示语
              <input
                value={formState.heroBadgeText}
                onChange={(event) => handleFieldChange("heroBadgeText", event.target.value)}
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
          </div>
        </article>

        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">品牌基础信息</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            这里是站点名称、标语和 Logo 等全局信息。
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-600">
              品牌名称
              <input
                value={formState.brandName}
                onChange={(event) => handleFieldChange("brandName", event.target.value)}
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              品牌标语
              <input
                value={formState.brandTagline}
                onChange={(event) => handleFieldChange("brandTagline", event.target.value)}
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              Logo 图片地址
              <input
                value={formState.logoUrl}
                onChange={(event) => handleFieldChange("logoUrl", event.target.value)}
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold tracking-[0.14em] text-slate-400">当前 Logo 预览</p>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                当前填写地址：{formState.logoUrl || "还没有填写"}
              </p>
            </div>
          </div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">品牌页摘要文案</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            这里控制品牌主张页顶部的文字展示。
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-600">
              摘要标题
              <input
                value={formState.brandSummaryTitle}
                onChange={(event) =>
                  handleFieldChange("brandSummaryTitle", event.target.value)
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              高亮标题
              <input
                value={formState.brandSummaryHighlight}
                onChange={(event) =>
                  handleFieldChange("brandSummaryHighlight", event.target.value)
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              摘要描述
              <textarea
                value={formState.brandSummaryDescription}
                onChange={(event) =>
                  handleFieldChange("brandSummaryDescription", event.target.value)
                }
                className="mt-2 h-36 w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none"
              />
            </label>
          </div>
        </article>

        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <p className="text-lg font-black text-slate-800">魔法币初始策略</p>
          <p className="mt-2 text-sm leading-7 text-slate-500">
            新注册用户将默认领取这里设置的魔法币数量。
          </p>

          <div className="mt-6 space-y-4">
            <label className="block text-sm font-bold text-slate-600">
              新用户默认赠送魔法币
              <input
                type="number"
                min={0}
                value={formState.initialCredits}
                onChange={(event) =>
                  handleFieldChange("initialCredits", Number(event.target.value))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>

            <div className="rounded-[24px] bg-[#fff7ed] p-4">
              <p className="text-sm font-black text-[#b86a12]">当前建议值</p>
              <p className="mt-2 text-sm leading-7 text-[#b86a12]">
                你刚刚提出的需求是每位新用户默认赠送 50 个魔法币，所以这里建议先保持 50。
              </p>
            </div>

            <button
              type="button"
              onClick={handleSave}
              className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
            >
              {saveStatus === "saving"
                ? "保存中"
                : saveStatus === "success"
                  ? "保存成功"
                  : saveStatus === "error"
                    ? "保存失败"
                    : "保存站点设置"}
            </button>
          </div>
        </article>
      </section>
    </div>
  );
}
