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
    <main className="relative min-h-screen overflow-hidden bg-[#f7f8ff] text-[#18213f]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_14%_10%,rgba(126,171,255,0.34),transparent_28%),radial-gradient(circle_at_82%_14%,rgba(255,159,211,0.3),transparent_24%),linear-gradient(180deg,#ffffff_0%,#f7f8ff_48%,#eff5ff_100%)]" />
        <div className="home-grid absolute inset-0 opacity-80" />
        <div className="home-sweep absolute left-[-12%] top-[16%] h-44 w-[70%] rounded-full bg-[linear-gradient(90deg,rgba(139,165,255,0),rgba(139,165,255,0.28),rgba(255,177,213,0))] blur-3xl" />
        <div className="absolute left-[58%] top-[10%] -translate-x-1/2">
          <Image
            src="/landing-assets/planet-smile-login-clean-v2.png"
            alt="微笑星球"
            width={179}
            height={101}
            className="orbital-float h-[122px] w-auto object-contain"
            priority
            unoptimized
          />
        </div>
        <div className="absolute right-[8%] top-[12%]">
          <Image
            src="/landing-assets/rocket-launch-login-clean-v2.png"
            alt="探索火箭"
            width={163}
            height={117}
            className="orbital-float h-[82px] w-auto rotate-[8deg] object-contain"
            unoptimized
          />
        </div>
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1920px] items-center px-4 py-8 sm:px-6 lg:px-14 lg:py-10 xl:px-20">
        <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.05fr)_520px] lg:gap-10">
          <section className="order-2 max-w-[760px] lg:order-1">
            <Link
              href="/"
              className="inline-flex items-center gap-3 rounded-full border border-[#dce5ff] bg-white/72 px-4 py-2 text-sm font-semibold text-[#5c6688] shadow-[0_12px_30px_rgba(112,138,215,0.1)] backdrop-blur-xl transition hover:border-[#bccaff] hover:text-[#273252]"
            >
              <span>返回首页</span>
            </Link>

            <div className="mt-8 flex min-w-0 items-center gap-4 sm:mt-10">
              <Image
                src={brand.logoUrl}
                alt={brand.siteName}
                width={56}
                height={56}
                className="rounded-[18px] shadow-[0_12px_28px_rgba(116,142,210,0.16)]"
                priority
                unoptimized
              />
              <div className="min-w-0">
                <p className="truncate text-[18px] font-semibold tracking-normal text-[#17213f] sm:text-[20px]">
                  {brand.siteName}
                </p>
                <p className="truncate text-[12px] tracking-[0.06em] text-[#677396] sm:text-[13px]">
                  {brand.tagline}
                </p>
              </div>
            </div>

            <h1 className="mt-8 text-[40px] font-black leading-[1.05] tracking-normal text-[#151f3d] sm:mt-10 sm:text-[48px] xl:text-[72px]">
              欢迎回来
              <span className="home-gradient-text mt-4 block">
                继续你的创作旅程
              </span>
            </h1>

            <p className="mt-6 max-w-[34ch] text-[16px] leading-7 text-[#5e6b8c] sm:mt-8 sm:text-[18px] sm:leading-9">
              输入手机号与验证码，重新进入你的魔法工坊，继续把想法变成真正的作品。
            </p>
          </section>

          <section className="order-1 relative lg:order-2">
            <div className="absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(141,119,255,0.16),transparent_58%)] blur-3xl" />
            <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/78 p-5 shadow-[0_30px_90px_rgba(92,116,189,0.18)] backdrop-blur-2xl sm:rounded-[36px] sm:p-7">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(124,147,255,0.16),transparent_24%),radial-gradient(circle_at_86%_80%,rgba(255,168,211,0.14),transparent_22%)]" />

              <div className="relative z-10">
                <div className="inline-flex rounded-full border border-[#d9e2ff] bg-white/72 px-3 py-1 text-xs font-semibold tracking-[0.12em] text-[#6875a5]">
                  进入工坊
                </div>

                <h2 className="mt-5 text-[30px] font-black leading-[1.08] tracking-normal text-[#17213f] sm:text-[38px]">
                  用验证码继续
                </h2>
                <p className="mt-3 text-[15px] leading-8 text-[#647092]">
                  整个过程只需要几秒钟，你的创作进度会在登录后继续保留。
                </p>

                <div className="mt-7 space-y-5">
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-semibold text-[#52607e]"
                    >
                      手机号
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value)}
                      placeholder="输入你的手机号"
                      className="h-14 w-full rounded-[22px] border border-[#dfe7ff] bg-white/86 px-5 text-[15px] text-[#17213f] outline-none placeholder:text-[#9aa6c4] transition focus:border-[#bccaff] focus:bg-white"
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="code"
                      className="mb-2 block text-sm font-semibold text-[#52607e]"
                    >
                      验证码
                    </label>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(event) => setCode(event.target.value)}
                        placeholder="输入验证码"
                        className="h-14 min-w-0 flex-1 rounded-[22px] border border-[#dfe7ff] bg-white/86 px-5 text-[15px] text-[#17213f] outline-none placeholder:text-[#9aa6c4] transition focus:border-[#bccaff] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={handleSendCode}
                        disabled={isSending}
                        className="h-14 rounded-[22px] border border-[#dfe7ff] bg-white px-5 text-sm font-semibold text-[#52607e] transition hover:border-[#bccaff] hover:text-[#273252] disabled:cursor-not-allowed disabled:opacity-60 sm:h-auto"
                      >
                        {isSending ? "发送中" : "获取验证码"}
                      </button>
                    </div>
                  </div>
                </div>

                {message && (
                  <div className="mt-5 rounded-[22px] border border-[#dfe7ff] bg-white/76 px-4 py-3 text-sm font-medium leading-7 text-[#5e6b8c]">
                    {message}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={isVerifying}
                  className="mt-6 h-14 w-full rounded-full bg-[#625cff] text-[15px] font-black text-white shadow-[0_18px_40px_rgba(98,92,255,0.24)] transition hover:bg-[#544cf4] disabled:cursor-not-allowed disabled:opacity-60"
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
