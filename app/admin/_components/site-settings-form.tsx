"use client";

import Image from "next/image";
import { useMemo, useState, type ChangeEvent } from "react";
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
  smsHumanVerificationProvider: "builtin" | "turnstile" | "disabled";
  smsCaptchaLength: number;
  smsCaptchaExpiresSeconds: number;
  smsCaptchaMaxAttempts: number;
  smsCaptchaIssuePerIpWindowSeconds: number;
  smsCaptchaIssuePerIpLimit: number;
  smsTurnstileSiteKey: string;
  smsTurnstileWidgetMode: "managed" | "non-interactive" | "invisible";
  smsOtpExpiresMinutes: number;
  smsResendCooldownSeconds: number;
  smsMaxSendsPerPhonePerHour: number;
  smsMaxSendsPerPhonePerDay: number;
  smsSendPerIpWindowSeconds: number;
  smsSendPerIpLimit: number;
  smsMaxVerifyAttemptsPerCode: number;
  smsVerifyPerIpWindowSeconds: number;
  smsVerifyPerIpLimit: number;
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
  const smsRiskControl = getSettingValue(settings, "auth.sms-risk-control", {
    humanVerificationProvider: "builtin",
    captchaLength: 4,
    captchaExpiresSeconds: 180,
    captchaMaxAttempts: 5,
    captchaIssuePerIpWindowSeconds: 600,
    captchaIssuePerIpLimit: 30,
    turnstileSiteKey: "",
    turnstileWidgetMode: "managed",
    otpExpiresMinutes: 5,
    resendCooldownSeconds: 60,
    maxSendsPerPhonePerHour: 5,
    maxSendsPerPhonePerDay: 10,
    sendPerIpWindowSeconds: 600,
    sendPerIpLimit: 12,
    maxVerifyAttemptsPerCode: 5,
    verifyPerIpWindowSeconds: 600,
    verifyPerIpLimit: 20,
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
    smsHumanVerificationProvider:
      smsRiskControl.humanVerificationProvider === "turnstile" ||
      smsRiskControl.humanVerificationProvider === "disabled"
        ? smsRiskControl.humanVerificationProvider
        : "builtin",
    smsCaptchaLength: Number(smsRiskControl.captchaLength ?? 4),
    smsCaptchaExpiresSeconds: Number(smsRiskControl.captchaExpiresSeconds ?? 180),
    smsCaptchaMaxAttempts: Number(smsRiskControl.captchaMaxAttempts ?? 5),
    smsCaptchaIssuePerIpWindowSeconds: Number(
      smsRiskControl.captchaIssuePerIpWindowSeconds ?? 600,
    ),
    smsCaptchaIssuePerIpLimit: Number(smsRiskControl.captchaIssuePerIpLimit ?? 30),
    smsTurnstileSiteKey: String(smsRiskControl.turnstileSiteKey ?? ""),
    smsTurnstileWidgetMode:
      smsRiskControl.turnstileWidgetMode === "non-interactive" ||
      smsRiskControl.turnstileWidgetMode === "invisible"
        ? smsRiskControl.turnstileWidgetMode
        : "managed",
    smsOtpExpiresMinutes: Number(smsRiskControl.otpExpiresMinutes ?? 5),
    smsResendCooldownSeconds: Number(smsRiskControl.resendCooldownSeconds ?? 60),
    smsMaxSendsPerPhonePerHour: Number(
      smsRiskControl.maxSendsPerPhonePerHour ?? 5,
    ),
    smsMaxSendsPerPhonePerDay: Number(
      smsRiskControl.maxSendsPerPhonePerDay ?? 10,
    ),
    smsSendPerIpWindowSeconds: Number(
      smsRiskControl.sendPerIpWindowSeconds ?? 600,
    ),
    smsSendPerIpLimit: Number(smsRiskControl.sendPerIpLimit ?? 12),
    smsMaxVerifyAttemptsPerCode: Number(
      smsRiskControl.maxVerifyAttemptsPerCode ?? 5,
    ),
    smsVerifyPerIpWindowSeconds: Number(
      smsRiskControl.verifyPerIpWindowSeconds ?? 600,
    ),
    smsVerifyPerIpLimit: Number(smsRiskControl.verifyPerIpLimit ?? 20),
  };
}

export function SiteSettingsForm({ initialSettings }: SiteSettingsFormProps) {
  const [formState, setFormState] = useState(() => createInitialState(initialSettings));
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [uploadStatus, setUploadStatus] = useState<SaveStatus>("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  const settingMap = useMemo(() => {
    return new Map(initialSettings.map((item) => [item.setting_key, item]));
  }, [initialSettings]);

  const handleFieldChange = (
    field: keyof SiteFormState,
    value: string | number | boolean,
  ) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadStatus("saving");
    setUploadMessage("");

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/admin/upload-logo", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Logo 上传失败");
      }

      handleFieldChange("logoUrl", data.url);
      setUploadStatus("success");
      setUploadMessage("Logo 已上传完成，保存站点设置后会全站生效。");
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(
        error instanceof Error ? error.message : "Logo 上传失败，请稍后再试。",
      );
    } finally {
      event.target.value = "";
      window.setTimeout(() => {
        setUploadStatus("idle");
        setUploadMessage("");
      }, 2400);
    }
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
      {
        setting_key: "auth.sms-risk-control",
        setting_group:
          settingMap.get("auth.sms-risk-control")?.setting_group ?? "security",
        label: settingMap.get("auth.sms-risk-control")?.label ?? "短信验证码风控",
        description:
          settingMap.get("auth.sms-risk-control")?.description ??
          "图形验证码、手机号限频、IP 限频和验证码尝试次数等风控策略。",
        value: {
          humanVerificationProvider: formState.smsHumanVerificationProvider,
          captchaLength: Math.max(4, Math.min(6, Number(formState.smsCaptchaLength) || 4)),
          captchaExpiresSeconds: Math.max(
            60,
            Number(formState.smsCaptchaExpiresSeconds) || 180,
          ),
          captchaMaxAttempts: Math.max(
            1,
            Number(formState.smsCaptchaMaxAttempts) || 5,
          ),
          captchaIssuePerIpWindowSeconds: Math.max(
            60,
            Number(formState.smsCaptchaIssuePerIpWindowSeconds) || 600,
          ),
          captchaIssuePerIpLimit: Math.max(
            1,
            Number(formState.smsCaptchaIssuePerIpLimit) || 30,
          ),
          turnstileSiteKey: formState.smsTurnstileSiteKey.trim(),
          turnstileWidgetMode: formState.smsTurnstileWidgetMode,
          otpExpiresMinutes: Math.max(
            1,
            Number(formState.smsOtpExpiresMinutes) || 5,
          ),
          resendCooldownSeconds: Math.max(
            10,
            Number(formState.smsResendCooldownSeconds) || 60,
          ),
          maxSendsPerPhonePerHour: Math.max(
            1,
            Number(formState.smsMaxSendsPerPhonePerHour) || 5,
          ),
          maxSendsPerPhonePerDay: Math.max(
            1,
            Number(formState.smsMaxSendsPerPhonePerDay) || 10,
          ),
          sendPerIpWindowSeconds: Math.max(
            60,
            Number(formState.smsSendPerIpWindowSeconds) || 600,
          ),
          sendPerIpLimit: Math.max(1, Number(formState.smsSendPerIpLimit) || 12),
          maxVerifyAttemptsPerCode: Math.max(
            1,
            Number(formState.smsMaxVerifyAttemptsPerCode) || 5,
          ),
          verifyPerIpWindowSeconds: Math.max(
            60,
            Number(formState.smsVerifyPerIpWindowSeconds) || 600,
          ),
          verifyPerIpLimit: Math.max(
            1,
            Number(formState.smsVerifyPerIpLimit) || 20,
          ),
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
              Logo 上传
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]">
                  {uploadStatus === "saving"
                    ? "上传中"
                    : uploadStatus === "success"
                      ? "上传成功"
                      : uploadStatus === "error"
                        ? "重新上传"
                        : "选择 PNG / JPG"}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
                <input
                  value={formState.logoUrl}
                  onChange={(event) => handleFieldChange("logoUrl", event.target.value)}
                  placeholder="也可以直接粘贴已上传的图片地址"
                  className="h-12 min-w-[260px] flex-1 rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                />
              </div>
            </label>
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold tracking-[0.14em] text-slate-400">当前 Logo 预览</p>
              <div className="mt-3 flex flex-wrap items-center gap-4">
                <div className="grid h-20 w-20 place-items-center overflow-hidden rounded-[22px] bg-white shadow-[0_10px_24px_rgba(148,163,184,0.1)]">
                  {formState.logoUrl ? (
                    <Image
                      src={formState.logoUrl}
                      alt="当前 Logo 预览"
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="text-xs font-bold text-slate-400">暂无</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-7 text-slate-500">
                    当前地址：{formState.logoUrl || "还没有填写"}
                  </p>
                  {uploadMessage && (
                    <p
                      className={`mt-2 text-sm font-bold ${
                        uploadStatus === "error"
                          ? "text-[#d4557c]"
                          : "text-[#1c8b5f]"
                      }`}
                    >
                      {uploadMessage}
                    </p>
                  )}
                </div>
              </div>
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

          </div>
        </article>
      </section>

      <section>
        <article className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-lg font-black text-slate-800">短信验证码风控策略</p>
              <p className="mt-2 max-w-[72ch] text-sm leading-7 text-slate-500">
                获取短信验证码前先做人机验证，再按手机号和 IP 做限频。这里的数字保存后会实时作用到登录接口，方便你随时收紧或放宽风控。
              </p>
            </div>
            <label className="block text-sm font-bold text-slate-600">
              人机验证方式
              <select
                value={formState.smsHumanVerificationProvider}
                onChange={(event) =>
                  handleFieldChange(
                    "smsHumanVerificationProvider",
                    event.target.value as SiteFormState["smsHumanVerificationProvider"],
                  )
                }
                className="mt-2 h-12 min-w-[240px] rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
              >
                <option value="turnstile">Cloudflare Turnstile</option>
                <option value="builtin">内置图形验证码</option>
                <option value="disabled">关闭人机验证</option>
              </select>
            </label>
          </div>

          <div className="mt-6 grid gap-5 xl:grid-cols-4">
            <div className="rounded-[24px] bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-800">Cloudflare Turnstile</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                推荐生产环境优先使用。后台保存 Site Key，服务端 Secret Key 放环境变量 `TURNSTILE_SECRET_KEY`。
              </p>
              <div className="mt-5 grid gap-4">
                <label className="block text-sm font-bold text-slate-600">
                  Site Key
                  <input
                    value={formState.smsTurnstileSiteKey}
                    onChange={(event) =>
                      handleFieldChange("smsTurnstileSiteKey", event.target.value)
                    }
                    placeholder="输入 Cloudflare Turnstile Site Key"
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  组件模式
                  <select
                    value={formState.smsTurnstileWidgetMode}
                    onChange={(event) =>
                      handleFieldChange(
                        "smsTurnstileWidgetMode",
                        event.target.value as SiteFormState["smsTurnstileWidgetMode"],
                      )
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                  >
                    <option value="managed">Managed（推荐）</option>
                    <option value="non-interactive">Non-interactive</option>
                    <option value="invisible">Invisible</option>
                  </select>
                </label>
                <div className="rounded-[20px] border border-dashed border-slate-200 bg-white p-4">
                  <p className="text-sm font-black text-slate-700">接入提醒</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    只填 Site Key 还不够，服务器还要配置 Secret Key。两边都配好后，登录页就会自动显示 Turnstile 勾选框。
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-800">图形验证码</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                这是内置兜底方案。只有当你把人机验证方式切到“内置图形验证码”时，这组参数才会生效。
              </p>
              <div className="mt-5 grid gap-4">
                <label className="block text-sm font-bold text-slate-600">
                  验证码位数
                  <input
                    type="number"
                    min={4}
                    max={6}
                    value={formState.smsCaptchaLength}
                    onChange={(event) =>
                      handleFieldChange("smsCaptchaLength", Number(event.target.value))
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  验证码有效期（秒）
                  <input
                    type="number"
                    min={60}
                    value={formState.smsCaptchaExpiresSeconds}
                    onChange={(event) =>
                      handleFieldChange(
                        "smsCaptchaExpiresSeconds",
                        Number(event.target.value),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  单图最大尝试次数
                  <input
                    type="number"
                    min={1}
                    value={formState.smsCaptchaMaxAttempts}
                    onChange={(event) =>
                      handleFieldChange(
                        "smsCaptchaMaxAttempts",
                        Number(event.target.value),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-600">
                    图片刷新窗口（秒）
                    <input
                      type="number"
                      min={60}
                      value={formState.smsCaptchaIssuePerIpWindowSeconds}
                      onChange={(event) =>
                        handleFieldChange(
                          "smsCaptchaIssuePerIpWindowSeconds",
                          Number(event.target.value),
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                    />
                  </label>
                  <label className="block text-sm font-bold text-slate-600">
                    单 IP 刷新上限
                    <input
                      type="number"
                      min={1}
                      value={formState.smsCaptchaIssuePerIpLimit}
                      onChange={(event) =>
                        handleFieldChange(
                          "smsCaptchaIssuePerIpLimit",
                          Number(event.target.value),
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-800">短信发送限频</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                发送前先做人机校验，再限制同手机号和同 IP 的请求频率。
              </p>
              <div className="mt-5 grid gap-4">
                <label className="block text-sm font-bold text-slate-600">
                  短信验证码有效期（分钟）
                  <input
                    type="number"
                    min={1}
                    value={formState.smsOtpExpiresMinutes}
                    onChange={(event) =>
                      handleFieldChange(
                        "smsOtpExpiresMinutes",
                        Number(event.target.value),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  同手机号重发冷却（秒）
                  <input
                    type="number"
                    min={10}
                    value={formState.smsResendCooldownSeconds}
                    onChange={(event) =>
                      handleFieldChange(
                        "smsResendCooldownSeconds",
                        Number(event.target.value),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-600">
                    单手机号每小时上限
                    <input
                      type="number"
                      min={1}
                      value={formState.smsMaxSendsPerPhonePerHour}
                      onChange={(event) =>
                        handleFieldChange(
                          "smsMaxSendsPerPhonePerHour",
                          Number(event.target.value),
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                    />
                  </label>
                  <label className="block text-sm font-bold text-slate-600">
                    单手机号每天上限
                    <input
                      type="number"
                      min={1}
                      value={formState.smsMaxSendsPerPhonePerDay}
                      onChange={(event) =>
                        handleFieldChange(
                          "smsMaxSendsPerPhonePerDay",
                          Number(event.target.value),
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                    />
                  </label>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-600">
                    单 IP 统计窗口（秒）
                    <input
                      type="number"
                      min={60}
                      value={formState.smsSendPerIpWindowSeconds}
                      onChange={(event) =>
                        handleFieldChange(
                          "smsSendPerIpWindowSeconds",
                          Number(event.target.value),
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                    />
                  </label>
                  <label className="block text-sm font-bold text-slate-600">
                    单 IP 发送上限
                    <input
                      type="number"
                      min={1}
                      value={formState.smsSendPerIpLimit}
                      onChange={(event) =>
                        handleFieldChange(
                          "smsSendPerIpLimit",
                          Number(event.target.value),
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="rounded-[24px] bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-800">验证码校验保护</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                限制验证码试错和暴力猜码，防止有人反复撞库。
              </p>
              <div className="mt-5 grid gap-4">
                <label className="block text-sm font-bold text-slate-600">
                  单条验证码最大输错次数
                  <input
                    type="number"
                    min={1}
                    value={formState.smsMaxVerifyAttemptsPerCode}
                    onChange={(event) =>
                      handleFieldChange(
                        "smsMaxVerifyAttemptsPerCode",
                        Number(event.target.value),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                  />
                </label>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-600">
                    校验统计窗口（秒）
                    <input
                      type="number"
                      min={60}
                      value={formState.smsVerifyPerIpWindowSeconds}
                      onChange={(event) =>
                        handleFieldChange(
                          "smsVerifyPerIpWindowSeconds",
                          Number(event.target.value),
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                    />
                  </label>
                  <label className="block text-sm font-bold text-slate-600">
                    单 IP 校验上限
                    <input
                      type="number"
                      min={1}
                      value={formState.smsVerifyPerIpLimit}
                      onChange={(event) =>
                        handleFieldChange(
                          "smsVerifyPerIpLimit",
                          Number(event.target.value),
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-white px-4 text-slate-800 outline-none"
                    />
                  </label>
                </div>

                <div className="rounded-[20px] bg-[#fff7ed] p-4">
                  <p className="text-sm font-black text-[#b86a12]">默认建议</p>
                  <p className="mt-2 text-sm leading-7 text-[#b86a12]">
                    建议优先使用 Turnstile 的 `Managed` 模式；如果先用内置图形码，则建议手机号 60 秒冷却、每小时 5 次、每天 10 次、单 IP 10 分钟 12 次。后面如果遇到真实攻击，再逐步收紧。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </article>
      </section>

      <div className="flex flex-wrap items-center gap-4 rounded-[28px] border border-white/80 bg-white px-6 py-5 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
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
        <p className="text-sm leading-7 text-slate-500">
          保存后新策略会直接作用到短信验证码接口，不需要重新发版。
        </p>
      </div>
    </div>
  );
}
