"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type BrandIdentity = {
  siteName: string;
  tagline: string;
  logoUrl: string;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [message, setMessage] = useState("");
  const [brand, setBrand] = useState<BrandIdentity>({
    siteName: "小红车魔法工坊",
    tagline: "下一代儿童AI创造力平台",
    logoUrl: "/logo.png",
  });
  const redirectTarget = searchParams.get("redirect") || "/workshop";

  useEffect(() => {
    let mounted = true;

    const loadBrand = async () => {
      try {
        const response = await fetch("/api/site/brand", {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          brand?: {
            siteName?: string;
            tagline?: string;
            logoUrl?: string;
          };
        };
        const identity = data.brand;

        if (!mounted || !identity) {
          return;
        }

        setBrand({
          siteName: identity.siteName ?? "小红车魔法工坊",
          tagline: identity.tagline ?? "下一代儿童AI创造力平台",
          logoUrl: identity.logoUrl ?? "/logo.png",
        });
      } catch {
        window.console.error("品牌信息加载失败");
      }
    };

    void loadBrand();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSendCode = async () => {
    if (!phone.trim()) {
      setMessage("先输入手机号，再继续下一步。");
      return;
    }

    setIsSending(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      const data = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "刚刚没发出去，请稍后再试。");
        return;
      }

      setMessage(data.message ?? "验证码已经发出，请查看手机。");
    } catch {
      setMessage("刚刚有一点网络波动，请稍后再试。");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerify = async () => {
    if (!phone.trim() || !code.trim()) {
      setMessage("请输入手机号和验证码。");
      return;
    }

    setIsVerifying(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone, code }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? "登录没有成功，再检查一下验证码。");
        return;
      }

      router.push(redirectTarget);
      router.refresh();
    } catch {
      setMessage("登录时遇到了一点小状况，请稍后再试。");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080512] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(116,221,255,0.12),transparent_16%),radial-gradient(circle_at_84%_14%,rgba(181,114,255,0.16),transparent_22%),linear-gradient(180deg,#07040f_0%,#10081f_46%,#080512_100%)]" />
        <div className="absolute inset-0 opacity-[0.16] [background-image:radial-gradient(rgba(255,255,255,0.88)_0.7px,transparent_0.7px)] [background-size:24px_24px]" />
        <div className="aurora-drift absolute left-[-8%] top-[6%] h-[420px] w-[420px] rounded-full bg-[#67d8ff]/10 blur-[140px]" />
        <div className="aurora-drift absolute right-[-10%] top-[0%] h-[520px] w-[520px] rounded-full bg-[#9d6fff]/14 blur-[160px]" />
        <div className="absolute left-[58%] top-[10%] -translate-x-1/2">
          <Image
            src="/landing-assets/planet-smile-clean.png"
            alt="微笑星球"
            width={179}
            height={101}
            className="orbital-float h-[122px] w-auto object-contain"
            priority
          />
        </div>
        <div className="absolute right-[12%] top-[18%]">
          <Image
            src="/landing-assets/rocket-launch.png"
            alt="探索火箭"
            width={163}
            height={117}
            className="orbital-float h-[98px] w-auto rotate-[8deg] object-contain"
          />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1920px] items-center px-8 py-10 lg:px-14 xl:px-20">
        <div className="grid w-full items-center gap-10 lg:grid-cols-[minmax(0,1.05fr)_520px]">
          <section className="max-w-[760px]">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-medium text-white/76 backdrop-blur-xl transition hover:bg-white/10 hover:text-white"
            >
              <span>返回首页</span>
            </Link>

            <div className="mt-10 flex items-center gap-4">
              <Image
                src={brand.logoUrl}
                alt={brand.siteName}
                width={56}
                height={56}
                className="rounded-[18px] shadow-[0_12px_28px_rgba(255,255,255,0.12)]"
                priority
                unoptimized
              />
              <div>
                <p className="text-[20px] font-semibold tracking-[-0.03em] text-white">
                  {brand.siteName}
                </p>
                <p className="text-[13px] tracking-[0.06em] text-white/42">
                  {brand.tagline}
                </p>
              </div>
            </div>

            <h1 className="mt-10 text-[60px] font-black leading-[0.96] tracking-[-0.075em] text-white xl:text-[78px]">
              欢迎回来
              <span className="mt-4 block bg-gradient-to-r from-[#8de1ff] via-[#f4b9ff] to-[#ffd788] bg-clip-text text-transparent">
                继续你的创作旅程
              </span>
            </h1>

            <p className="mt-8 max-w-[540px] text-[19px] leading-9 text-white/60">
              输入手机号与验证码，重新进入你的魔法工坊，继续把想法变成真正的作品。
            </p>
          </section>

          <section className="relative">
            <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(141,119,255,0.22),transparent_58%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.1),rgba(255,255,255,0.04))] p-7 shadow-[0_30px_80px_rgba(0,0,0,0.3)] backdrop-blur-2xl">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.1),transparent_24%),radial-gradient(circle_at_86%_80%,rgba(120,221,255,0.08),transparent_22%)]" />

              <div className="relative z-10">
                <div className="inline-flex rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-white/70">
                  进入工坊
                </div>

                <h2 className="mt-5 text-[38px] font-black leading-[1.04] tracking-[-0.06em] text-white">
                  用验证码继续
                </h2>
                <p className="mt-3 text-[15px] leading-8 text-white/54">
                  整个过程只需要几秒钟，你的创作进度会在登录后继续保留。
                </p>

                <div className="mt-7 space-y-5">
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-semibold text-white/72"
                    >
                      手机号
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="输入你的手机号"
                      className="h-14 w-full rounded-[22px] border border-white/10 bg-white/6 px-5 text-[15px] text-white outline-none placeholder:text-white/28 transition focus:border-white/20 focus:bg-white/8"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="code"
                      className="mb-2 block text-sm font-semibold text-white/72"
                    >
                      验证码
                    </label>
                    <div className="flex gap-3">
                      <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="输入验证码"
                        className="h-14 min-w-0 flex-1 rounded-[22px] border border-white/10 bg-white/6 px-5 text-[15px] text-white outline-none placeholder:text-white/28 transition focus:border-white/20 focus:bg-white/8"
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={isSending}
                        className="rounded-[22px] border border-white/10 bg-white/8 px-5 text-sm font-semibold text-white transition hover:bg-white/12 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isSending ? "发送中" : "获取验证码"}
                      </button>
                    </div>
                  </div>
                </div>

                {message && (
                  <div className="mt-5 rounded-[22px] border border-white/10 bg-white/6 px-4 py-3 text-sm font-medium leading-7 text-white/70">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="mt-6 h-14 w-full rounded-full bg-[linear-gradient(90deg,#ffbc7c_0%,#ff8fc7_46%,#8974ff_100%)] text-[15px] font-black text-white shadow-[0_18px_40px_rgba(140,96,255,0.34)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isVerifying ? "正在进入工坊" : "进入工坊"}
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
