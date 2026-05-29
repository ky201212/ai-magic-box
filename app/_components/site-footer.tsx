import Image from "next/image";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/70 bg-white/88 px-4 py-6 text-[#667392] backdrop-blur sm:px-6">
      <div className="mx-auto flex w-full max-w-[1920px] flex-col items-center gap-2 text-center text-[12px] leading-6 sm:text-[13px]">
        <a
          href="https://beian.miit.gov.cn"
          target="_blank"
          rel="noreferrer"
          className="transition hover:text-[#3f5ecf]"
        >
          粤ICP备2025382367号-1
        </a>
        <a
          href="https://beian.mps.gov.cn/#/query/webSearch?code=44060802000434"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 transition hover:text-[#3f5ecf]"
        >
          <Image
            src="/beian-icon.png"
            alt="备案编号图标"
            width={18}
            height={18}
            className="h-[18px] w-[18px]"
          />
          <span>粤公网安备44060802000434号</span>
        </a>
      </div>
    </footer>
  );
}
