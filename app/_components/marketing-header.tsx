import Image from "next/image";
import Link from "next/link";
import { marketingNavItems } from "./marketing-nav";

type BrandIdentity = {
  siteName: string;
  tagline: string;
  logoUrl: string;
};

type MarketingHeaderProps = {
  brandIdentity: BrandIdentity;
  activeHref?: string;
  isLoggedIn?: boolean;
  loginRedirect?: string;
};

export function MarketingHeader({
  brandIdentity,
  activeHref,
  isLoggedIn = false,
  loginRedirect,
}: MarketingHeaderProps) {
  const loginHref = loginRedirect
    ? `/login?redirect=${encodeURIComponent(loginRedirect)}`
    : "/login";

  return (
    <header className="flex flex-col gap-4 rounded-[24px] border border-white/80 bg-white/76 px-4 py-3 shadow-[0_18px_50px_rgba(84,107,170,0.12)] backdrop-blur-2xl sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <Link href="/" className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Image
          src={brandIdentity.logoUrl}
          alt={brandIdentity.siteName}
          width={54}
          height={54}
          className="h-11 w-11 rounded-[14px] bg-white object-cover shadow-[0_12px_28px_rgba(116,142,210,0.16)] sm:h-[54px] sm:w-[54px] sm:rounded-[18px]"
          priority
        />
        <div className="min-w-0">
          <p className="truncate text-[16px] font-semibold tracking-normal text-[#17213f] sm:text-[18px]">
            {brandIdentity.siteName}
          </p>
          <p className="truncate text-[11px] tracking-[0.08em] text-[#677396] sm:text-[12px]">
            {brandIdentity.tagline}
          </p>
        </div>
      </Link>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-end lg:gap-6">
        <nav className="flex flex-wrap items-center gap-4 text-[13px] font-semibold text-[#6a7392] sm:gap-5 sm:text-[14px]">
          {marketingNavItems.map((item) => {
            const isActive = activeHref === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative transition hover:text-[#17213f] ${
                  isActive ? "text-[#6c63ff]" : "text-[#6a7392]"
                }`}
              >
                {item.label}
                {isActive ? (
                  <span className="absolute -bottom-2 left-1/2 hidden h-[2px] w-8 -translate-x-1/2 rounded-full bg-[#8b7cff] sm:block" />
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="flex w-full flex-wrap items-center gap-2 rounded-[22px] border border-[#dce5ff] bg-white/78 p-1.5 sm:w-auto sm:rounded-full">
          {isLoggedIn ? (
            <>
              <Link
                href="/profile"
                className={`flex-1 rounded-full border px-4 py-2.5 text-center text-[13px] font-semibold transition sm:flex-none ${
                  activeHref === "/profile"
                    ? "border-[#cdd8ff] bg-[#eef3ff] text-[#5e62d9]"
                    : "border-[#e1e7ff] bg-white text-[#5c6688] hover:border-[#bccaff] hover:text-[#273252]"
                }`}
              >
                我的主页
              </Link>
              <form action="/api/auth/logout" method="POST" className="flex-1 sm:flex-none">
                <button
                  type="submit"
                  className="w-full rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252]"
                >
                  退出登录
                </button>
              </form>
            </>
          ) : (
            <Link
              href={loginHref}
              className="flex-1 rounded-full border border-[#e1e7ff] bg-white px-4 py-2.5 text-center text-[13px] font-semibold text-[#5c6688] transition hover:border-[#bccaff] hover:text-[#273252] sm:flex-none"
            >
              手机号登录
            </Link>
          )}
          <Link
            href="/workshop?mode=coding"
            className="flex-1 rounded-full bg-[#625cff] px-5 py-2.5 text-center text-[14px] font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4] sm:flex-none"
          >
            进入工坊
          </Link>
        </div>
      </div>
    </header>
  );
}
