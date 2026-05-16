import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listInfoContentPosts } from "@/lib/admin-data";
import {
  getInfoCategoryHref,
  getInfoCategoryTitle,
  getInfoPostExcerpt,
} from "@/lib/info-content";

type InfoDetailPageProps = {
  params: Promise<{
    postId: string;
  }>;
};

function renderParagraphs(body: string) {
  return body
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export default async function InfoDetailPage({
  params,
}: InfoDetailPageProps) {
  const { postId } = await params;
  const posts = await listInfoContentPosts().catch(() => []);
  const post = posts.find((item) => item.id === postId);

  if (!post) {
    notFound();
  }

  const paragraphs = renderParagraphs(post.body);

  return (
    <main className="min-h-screen bg-[#f7f8ff] px-5 py-10 text-[#18213f] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-[980px]">
        <article className="overflow-hidden rounded-[34px] border border-white/80 bg-white/82 shadow-[0_30px_90px_rgba(92,116,189,0.14)] backdrop-blur-2xl">
          <div className="border-b border-[#edf1ff] px-7 py-8 sm:px-10">
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href="/world"
                className="rounded-full border border-[#dce5ff] bg-white px-4 py-2 text-sm font-black text-[#566382]"
              >
                返回科普资讯
              </Link>
              <Link
                href={getInfoCategoryHref(post.category)}
                className="rounded-full border border-[#dfe7ff] bg-[#f8f9ff] px-4 py-2 text-sm font-black text-[#627ee6]"
              >
                {getInfoCategoryTitle(post.category)}
              </Link>
            </div>

            <h1 className="mt-6 text-[34px] font-black leading-[1.18] text-[#17213f] sm:text-[46px]">
              {post.title}
            </h1>
            {post.subtitle ? (
              <p className="mt-4 text-[18px] font-bold leading-9 text-[#516089]">
                {post.subtitle}
              </p>
            ) : null}
            <p className="mt-4 text-sm font-bold text-[#8a95b4]">
              {post.publishedAt}
            </p>
          </div>

          <div className="px-7 py-8 sm:px-10">
            {post.coverUrl ? (
              <div className="overflow-hidden rounded-[28px] border border-[#edf1ff] bg-[#f8f9ff]">
                <Image
                  src={post.coverUrl}
                  alt={post.title}
                  width={1200}
                  height={720}
                  className="max-h-[520px] w-full object-cover"
                />
              </div>
            ) : null}

            {post.videoUrl ? (
              <div className={`${post.coverUrl ? "mt-6" : ""} overflow-hidden rounded-[28px] border border-[#edf1ff] bg-black`}>
                <video
                  src={post.videoUrl}
                  controls
                  className="max-h-[520px] w-full"
                />
              </div>
            ) : null}

            {!post.coverUrl && !post.videoUrl ? (
              <div className="rounded-[26px] border border-[#edf1ff] bg-[#f8f9ff] px-6 py-5 text-[15px] leading-8 text-[#647092]">
                {getInfoPostExcerpt(post)}
              </div>
            ) : null}

            <div className="mt-8 space-y-5 text-[16px] leading-9 text-[#3f4d75]">
              {paragraphs.length ? (
                paragraphs.map((paragraph, index) => (
                  <p key={`${post.id}-${index}`}>{paragraph}</p>
                ))
              ) : (
                <p>{getInfoPostExcerpt(post)}</p>
              )}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
