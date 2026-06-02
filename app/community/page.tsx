import { cookies } from "next/headers";
import { MarketingHeader } from "../_components/marketing-header";
import { CommunityClient } from "./community-client";
import { getBrandIdentitySetting } from "@/lib/site-config";
import { getCommunityOverview, listApprovedCommunityPosts } from "@/lib/community";

export default async function CommunityPage() {
  const cookieStore = await cookies();
  const isLoggedIn = Boolean(cookieStore.get("magic_session")?.value);
  const [brandIdentity, initialPosts, initialOverview] = await Promise.all([
    getBrandIdentitySetting(),
    listApprovedCommunityPosts().catch(() => []),
    getCommunityOverview().catch(() => null),
  ]);

  return (
    <main className="min-h-screen bg-[#f7f8ff] text-[#17213f]">
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_12%_12%,rgba(117,159,255,0.34),transparent_26%),radial-gradient(circle_at_88%_10%,rgba(255,166,213,0.26),transparent_26%),radial-gradient(circle_at_50%_70%,rgba(255,205,119,0.18),transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8f9ff_44%,#eff5ff_100%)]" />
          <div className="home-grid absolute inset-0 opacity-80" />
          <div className="home-sweep absolute left-[-10%] top-[20%] h-48 w-[72%] rounded-full bg-[linear-gradient(90deg,rgba(124,148,255,0),rgba(124,148,255,0.25),rgba(255,161,211,0))] blur-3xl" />
          <div className="float-soft absolute right-[6%] top-[18%] h-24 w-24 rounded-[28px] border border-white/80 bg-white/60 shadow-[0_22px_50px_rgba(104,126,190,0.16)]" />
        </div>

        <div className="relative mx-auto w-full max-w-[1800px] px-4 pb-12 pt-5 sm:px-6 sm:pb-16 sm:pt-6 lg:px-12 2xl:px-16">
          <MarketingHeader
            brandIdentity={brandIdentity}
            activeHref="/community"
            isLoggedIn={isLoggedIn}
            loginRedirect="/community"
          />

          <CommunityClient
            isLoggedIn={isLoggedIn}
            initialPosts={initialPosts}
            initialOverview={initialOverview}
          />
        </div>
      </div>
    </main>
  );
}
