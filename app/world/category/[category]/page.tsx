import Link from "next/link";
import { notFound } from "next/navigation";
import { listInfoContentPosts } from "@/lib/admin-data";
import {
  getInfoCategoryHref,
  getInfoCategoryTitle,
  getInfoPostExcerpt,
  getInfoPostHref,
  isInfoCategoryKey,
} from "@/lib/info-content";

type CategoryPageProps = {
  params: Promise<{
    category: string;
  }>;
};

export default async function WorldCategoryPage({
  params,
}: CategoryPageProps) {
  const { category } = await params;

  if (!isInfoCategoryKey(category)) {
    notFound();
  }

  const posts = await listInfoContentPosts().catch(() => []);
  const categoryPosts = posts.filter((post) => post.category === category);

  return (
    <main className="min-h-screen bg-[#f7f8ff] px-5 py-10 text-[#18213f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[1120px]">
        <div className="rounded-[30px] border border-white/80 bg-white/78 p-8 shadow-[0_24px_70px_rgba(92,116,189,0.12)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black tracking-[0.16em] text-[#7b86a8]">
                CONTENT CATEGORY
              </p>
              <h1 className="mt-3 text-[36px] font-black text-[#17213f] sm:text-[44px]">
                {getInfoCategoryTitle(category)}
              </h1>
            </div>
            <Link
              href="/world"
              className="rounded-full border border-[#dce5ff] bg-white px-4 py-2.5 text-sm font-black text-[#566382]"
            >
              返回科普资讯
            </Link>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            {(["science", "video", "honor", "event"] as const).map((item) => (
              <Link
                key={item}
                href={getInfoCategoryHref(item)}
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  item === category
                    ? "bg-[#625cff] text-white"
                    : "border border-[#dce5ff] bg-white text-[#5d6a8a]"
                }`}
              >
                {getInfoCategoryTitle(item)}
              </Link>
            ))}
          </div>
        </div>

        <section className="mt-8 grid gap-5 md:grid-cols-2">
          {categoryPosts.length ? (
            categoryPosts.map((post) => (
              <Link
                key={post.id}
                href={getInfoPostHref(post.id)}
                className="rounded-[28px] border border-white/80 bg-white p-6 shadow-[0_18px_54px_rgba(92,116,189,0.1)] transition hover:-translate-y-0.5 hover:border-[#dbe4ff]"
              >
                <div className="inline-flex rounded-full border border-[#dfe7ff] bg-white px-3 py-1.5 text-[12px] font-black text-[#627ee6]">
                  {getInfoCategoryTitle(post.category)}
                </div>
                <h2 className="mt-4 text-[28px] font-black leading-[1.2] text-[#17213f]">
                  {post.title}
                </h2>
                {post.subtitle ? (
                  <p className="mt-3 text-[16px] font-bold leading-8 text-[#4f5d84]">
                    {post.subtitle}
                  </p>
                ) : null}
                <p className="mt-4 text-[15px] leading-8 text-[#647092]">
                  {getInfoPostExcerpt(post)}
                </p>
                <p className="mt-6 text-sm font-bold text-[#8a95b4]">
                  {post.publishedAt}
                </p>
              </Link>
            ))
          ) : (
            <div className="rounded-[28px] border border-dashed border-[#dce3f6] bg-white/75 px-6 py-12 text-center text-[#7d88a8] md:col-span-2">
              这个栏目暂时还没有已发布内容。
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
