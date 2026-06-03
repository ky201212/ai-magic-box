"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import {
  getDefaultProfileAvatarPreset,
  getProfileAvatarPresetByUrl,
  PROFILE_AVATAR_PRESETS,
} from "@/lib/profile-avatar-presets";
import {
  CHINA_MAINLAND_PHONE_PATTERN,
  validateProfileDisplayName,
} from "@/lib/profile-settings-validation";

export type ProfileSettingsSnapshot = {
  displayName: string;
  phone: string;
  bio: string;
  avatarUrl: string;
  avatarColor: string;
};

type ProfileSettingsDialogProps = {
  isOpen: boolean;
  initialSettings: ProfileSettingsSnapshot;
  onClose: () => void;
  onSaved: (nextSettings: {
    profile: {
      display_name: string | null;
      avatar_color: string | null;
      bio: string | null;
    };
    phone: string;
    avatarUrl: string;
  }) => void;
};

export function ProfileSettingsDialog({
  isOpen,
  initialSettings,
  onClose,
  onSaved,
}: ProfileSettingsDialogProps) {
  const [form, setForm] = useState<ProfileSettingsSnapshot>(initialSettings);
  const [phoneCode, setPhoneCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [codeCooldownSeconds, setCodeCooldownSeconds] = useState(0);

  useEffect(() => {
    if (codeCooldownSeconds <= 0) {
      return;
    }

    const timer = window.setTimeout(() => {
      setCodeCooldownSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [codeCooldownSeconds]);

  if (!isOpen) {
    return null;
  }

  const activePreset =
    getProfileAvatarPresetByUrl(form.avatarUrl) ?? getDefaultProfileAvatarPreset();
  const isPhoneChanged = form.phone !== initialSettings.phone;
  const displayNameValidation = validateProfileDisplayName(form.displayName);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17213f]/32 px-4 py-4 backdrop-blur-md sm:px-5">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-white/80 bg-white/94 p-5 shadow-[0_30px_90px_rgba(40,53,100,0.26)] sm:p-6 lg:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-[#dbe4ff] bg-[#f8faff] px-4 py-2 text-xs font-black tracking-[0.18em] text-[#7280ab]">
              资料设置 SETTINGS
            </p>
            <h3 className="mt-4 text-[30px] font-black tracking-[-0.05em] text-[#17213f] sm:text-[38px]">
              修改用户名、手机号和头像
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#687394]">
              这里可以统一调整你的主页资料。头像只能从我们准备好的 6 个角色里选择，保存后主页会马上更新。
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid h-11 w-11 place-items-center rounded-full border border-[#dce5ff] bg-white text-xl font-black text-[#687394] transition hover:border-[#bccaff] hover:text-[#273252]"
          >
            ×
          </button>
        </div>

        <div className="mt-6 grid gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="rounded-[28px] border border-[#e2e8ff] bg-[linear-gradient(180deg,#fbfcff_0%,#f3f6ff_100%)] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
            <p className="text-sm font-black tracking-[0.14em] text-[#7c88ae]">
              实时预览
            </p>
            <div className="mt-5 overflow-hidden rounded-[28px] border border-white/80 bg-white/88 p-5 shadow-[0_16px_40px_rgba(92,116,189,0.1)]">
              <div
                className="relative mx-auto h-28 w-28 overflow-hidden rounded-[28px] border-4 border-white shadow-[0_16px_36px_rgba(98,92,255,0.18)]"
                style={{ boxShadow: `0 16px 36px ${activePreset.accentColor}33` }}
              >
                <Image
                  src={activePreset.url}
                  alt={activePreset.name}
                  fill
                  className="object-cover"
                  sizes="112px"
                />
              </div>
              <div className="mt-5 text-center">
                <p className="text-[24px] font-black tracking-[-0.04em] text-[#17213f]">
                  {form.displayName.trim() || "小创作者"}
                </p>
                <p className="mt-2 text-sm font-semibold text-[#7d89ad]">
                  {form.phone || "请输入手机号"}
                </p>
                <p className="mt-4 text-sm leading-7 text-[#687394]">
                  {form.bio.trim() || "这里会显示你的个人简介和创作风格。"}
                </p>
              </div>
            </div>
          </div>

          <form
            className="space-y-5"
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSaving(true);
              setMessage("");

              try {
                const response = await fetch("/api/community/me", {
                  method: "PATCH",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    displayName: form.displayName,
                    phone: form.phone,
                    bio: form.bio,
                    avatarUrl: form.avatarUrl,
                    avatarColor: form.avatarColor,
                    phoneCode: isPhoneChanged ? phoneCode : undefined,
                  }),
                });
                const payload = (await response.json()) as {
                  error?: string;
                  profile?: {
                    display_name: string | null;
                    avatar_color: string | null;
                    bio: string | null;
                  };
                  phone?: string;
                  avatarUrl?: string;
                };

                if (!response.ok || !payload.profile || !payload.phone || !payload.avatarUrl) {
                  throw new Error(payload.error ?? "个人资料保存失败。");
                }

                onSaved({
                  profile: payload.profile,
                  phone: payload.phone,
                  avatarUrl: payload.avatarUrl,
                });
                onClose();
              } catch (requestError) {
                setMessage(
                  requestError instanceof Error
                    ? requestError.message
                    : "个人资料保存失败。",
                );
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <div className="grid gap-5 lg:grid-cols-2">
              <label className="block rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-[0_14px_34px_rgba(92,116,189,0.08)]">
                <span className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                  用户名称
                </span>
                <input
                  value={form.displayName}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      displayName: event.target.value,
                    }))
                  }
                  maxLength={16}
                  placeholder="例如：火箭小创客"
                  className="mt-3 w-full rounded-[18px] border border-[#dce5ff] bg-[#f8faff] px-4 py-3 text-sm font-semibold text-[#17213f] outline-none transition placeholder:text-[#9ba6c5] focus:border-[#98aaff] focus:bg-white"
                />
                <p
                  className={`mt-2 text-xs ${
                    displayNameValidation.ok ? "text-[#8b97b8]" : "font-semibold text-[#c45a7e]"
                  }`}
                >
                  {displayNameValidation.ok
                    ? "支持 2 到 16 个字，不能使用官方、系统、AI 或不文明词。"
                    : displayNameValidation.error}
                </p>
              </label>

              <label className="block rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-[0_14px_34px_rgba(92,116,189,0.08)]">
                <span className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                  手机号码
                </span>
                <div className="mt-3 flex gap-2">
                  <input
                    value={form.phone}
                    onChange={(event) => {
                      const nextPhone = event.target.value.replace(/\D/g, "").slice(0, 11);
                      setForm((current) => ({
                        ...current,
                        phone: nextPhone,
                      }));
                      setPhoneCode("");
                    }}
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="请输入 11 位手机号"
                    className="min-w-0 flex-1 rounded-[18px] border border-[#dce5ff] bg-[#f8faff] px-4 py-3 text-sm font-semibold text-[#17213f] outline-none transition placeholder:text-[#9ba6c5] focus:border-[#98aaff] focus:bg-white"
                  />
                  <button
                    type="button"
                    disabled={
                      !isPhoneChanged ||
                      isSendingCode ||
                      codeCooldownSeconds > 0 ||
                      !CHINA_MAINLAND_PHONE_PATTERN.test(form.phone)
                    }
                    onClick={async () => {
                      setIsSendingCode(true);
                      setMessage("");

                      try {
                        const response = await fetch("/api/community/me/phone-code", {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({ phone: form.phone }),
                        });
                        const payload = (await response.json()) as {
                          error?: string;
                          message?: string;
                        };

                        if (!response.ok) {
                          throw new Error(payload.error ?? "验证码发送失败。");
                        }

                        setPhoneCode("");
                        setCodeCooldownSeconds(60);
                        setMessage(payload.message ?? "验证码已发送，请注意查收短信。");
                      } catch (requestError) {
                        setMessage(
                          requestError instanceof Error
                            ? requestError.message
                            : "验证码发送失败。",
                        );
                      } finally {
                        setIsSendingCode(false);
                      }
                    }}
                    className="shrink-0 rounded-[18px] border border-[#dce5ff] bg-white px-4 py-3 text-xs font-black text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSendingCode
                      ? "发送中"
                      : codeCooldownSeconds > 0
                        ? `${codeCooldownSeconds}s`
                        : "获取验证码"}
                  </button>
                </div>
                <p className="mt-2 text-xs text-[#8b97b8]">
                  {isPhoneChanged
                    ? "更换手机号必须先验证新手机号，验证码每小时最多发送 5 条。"
                    : "当前手机号未改变，保存资料时不需要验证码。"}
                </p>
              </label>
            </div>

            {isPhoneChanged && (
              <label className="block rounded-[24px] border border-[#e1e8ff] bg-[#f8faff] p-5">
                <span className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                  短信验证码
                </span>
                <input
                  value={phoneCode}
                  onChange={(event) =>
                    setPhoneCode(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="输入新手机号收到的验证码"
                  className="mt-3 w-full rounded-[18px] border border-[#dce5ff] bg-white px-4 py-3 text-sm font-semibold text-[#17213f] outline-none transition placeholder:text-[#9ba6c5] focus:border-[#98aaff]"
                />
                <p className="mt-2 text-xs text-[#8b97b8]">
                  验证通过后，这个手机号才会成为新的登录手机号。
                </p>
              </label>
            )}

            <label className="block rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-[0_14px_34px_rgba(92,116,189,0.08)]">
              <span className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                个人简介
              </span>
              <textarea
                value={form.bio}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    bio: event.target.value.slice(0, 80),
                  }))
                }
                rows={4}
                placeholder="写一句介绍自己创作风格的话吧。"
                className="mt-3 w-full resize-none rounded-[18px] border border-[#dce5ff] bg-[#f8faff] px-4 py-3 text-sm leading-7 text-[#17213f] outline-none transition placeholder:text-[#9ba6c5] focus:border-[#98aaff] focus:bg-white"
              />
              <div className="mt-2 flex items-center justify-between gap-3 text-xs text-[#8b97b8]">
                <span>这段话会显示在我的主页信息卡片里。</span>
                <span>{form.bio.length}/80</span>
              </div>
            </label>

            <div className="rounded-[24px] border border-white/80 bg-white/88 p-5 shadow-[0_14px_34px_rgba(92,116,189,0.08)]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black tracking-[0.14em] text-[#7782a4]">
                    选择头像
                  </p>
                  <p className="mt-2 text-sm text-[#687394]">
                    头像只能从系统提供的角色中选择，保证站内风格统一。
                  </p>
                </div>
                <div className="rounded-full bg-[#f4f7ff] px-4 py-2 text-xs font-black text-[#6170a2]">
                  当前：{activePreset.name}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {PROFILE_AVATAR_PRESETS.map((preset) => {
                  const isActive = preset.url === form.avatarUrl;

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          avatarUrl: preset.url,
                          avatarColor: preset.accentColor,
                        }))
                      }
                      className={`rounded-[24px] border p-3 text-left transition ${
                        isActive
                          ? "border-[#98aaff] bg-[#f6f8ff] shadow-[0_18px_36px_rgba(98,92,255,0.14)]"
                          : "border-[#e3e9ff] bg-white hover:border-[#c8d4ff] hover:bg-[#fbfcff]"
                      }`}
                    >
                      <div className="relative overflow-hidden rounded-[20px]">
                        <div
                          className="absolute inset-0 rounded-[20px] opacity-30"
                          style={{
                            background: `linear-gradient(160deg, ${preset.accentColor}22, transparent 70%)`,
                          }}
                        />
                        <div className="relative aspect-square overflow-hidden rounded-[20px]">
                          <Image
                            src={preset.url}
                            alt={preset.name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 1280px) 50vw, 180px"
                          />
                        </div>
                      </div>
                      <p className="mt-3 text-sm font-black text-[#17213f]">{preset.name}</p>
                      <p className="mt-1 text-xs leading-6 text-[#7b88ad]">
                        {preset.description}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#e5eaff] bg-[#f8faff] px-5 py-4">
              <p
                className={`text-sm ${
                  message
                    ? message.includes("成功")
                      ? "font-black text-[#1e9b66]"
                      : "font-semibold text-[#c45a7e]"
                    : "text-[#7b88ad]"
                }`}
              >
                {message || "保存后会立即刷新左侧主页资料卡片。"}
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-[#dce5ff] bg-white px-5 py-3 text-sm font-black text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252]"
                >
                  先不改了
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-[#625cff] px-6 py-3 text-sm font-black text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "保存中" : "保存资料"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
