"use client";

import Link from "next/link";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  COMMUNITY_CATEGORY_ACCENT,
  COMMUNITY_CATEGORY_DESCRIPTIONS,
  COMMUNITY_CATEGORY_LABELS,
} from "@/lib/community-config";

type CommunityClientProps = {
  isLoggedIn: boolean;
  initialPosts: CommunityPost[];
  initialOverview: CommunityOverview | null;
};

type CommunityPost = {
  id: string;
  user_id: string;
  mode: "coding" | "writing" | "painting";
  title: string;
  description: string | null;
  prompt: string;
  preview_image_url: string;
  like_count: number;
  view_count: number;
  share_count: number;
  category: string;
  created_at: string;
  is_featured: boolean;
  manual_sort_order: number;
  creator_score: number;
  manual_creator_rank: number | null;
  is_creator_star: boolean;
  users: {
    id: string;
    phone: string;
    nickname: string | null;
  } | null;
  user_profiles: {
    user_id: string;
    display_name: string | null;
    avatar_color: string | null;
  } | null;
};

type CommunityCreator = {
  user_id: string;
  name: string;
  avatar_color: string | null;
  works_count: number;
  total_likes: number;
  total_views: number;
  total_shares: number;
  categories: string[];
  manual_rank: number | null;
  creator_score: number;
  is_creator_star: boolean;
};

type CommunityOverview = {
  totalWorks: number;
  totalCreators: number;
  totalLikes: number;
  totalViews: number;
  totalShares: number;
  displayTotalLikes: number;
  activeCreators: CommunityCreator[];
  creatorStars: CommunityCreator[];
};

type CommunityTab = "精选作品" | "最新作品" | "最多点赞" | (typeof COMMUNITY_CATEGORY_LABELS)[number];

const visibleCategoryLabels = COMMUNITY_CATEGORY_LABELS.filter((label) => label !== "科学实验");

const tabs: CommunityTab[] = [
  "精选作品",
  "最新作品",
  "最多点赞",
  ...visibleCategoryLabels,
];

const gradientByCategory: Record<string, string> = {
  创意编程: "from-[#7385ff] via-[#8f95ff] to-[#c6d5ff]",
  绘画设计: "from-[#ff95c9] via-[#ffb3da] to-[#ffe5f4]",
  故事写作: "from-[#7067ff] via-[#9f9fff] to-[#dfe4ff]",
  视频动画: "from-[#ff9b74] via-[#ffc26b] to-[#fff0ba]",
  音乐创作: "from-[#64c7ff] via-[#7fd8ff] to-[#e0f7ff]",
  科学实验: "from-[#8f73ff] via-[#c084fc] to-[#ffe0f2]",
};

const inspirationNotes = [
  "作品内容需符合国家法律法规、政治规范和未成年人保护要求。",
  "严禁色情低俗、血腥暴力、辱骂攻击、危险模仿和不良诱导内容。",
  "不得发布侵犯他人隐私、版权、肖像权或冒用他人身份的作品。",
  "标题、封面、提示词和正文都要真实友好，避免夸张标题和误导表达。",
];

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function authorName(post: CommunityPost) {
  return (
    post.user_profiles?.display_name ||
    post.users?.nickname ||
    post.users?.phone ||
    "小创作者"
  );
}

function authorInitial(name: string) {
  return name.trim().slice(0, 1) || "创";
}

function SectionTitle({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[26px] font-black tracking-[-0.04em] text-[#17213f]">{title}</h3>
      {action}
    </div>
  );
}

function WritingPostThumbnail({
  title,
  prompt,
}: {
  title: string;
  prompt: string;
}) {
  return (
    <div className="relative flex h-full w-full overflow-hidden bg-[linear-gradient(180deg,#fff7db_0%,#fffdf4_58%,#ffeaf0_100%)] p-4">
      <div className="absolute inset-x-5 top-5 h-px bg-[#f4cf7a]/70" />
      <div className="absolute inset-y-4 left-6 w-px bg-[#f6b8c6]/80" />
      <div className="relative flex h-full w-full flex-col rounded-[18px] border border-[#f3df99] bg-white/84 px-4 py-4 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.72)]">
        <div className="inline-flex w-fit rounded-full bg-[#fff1c9] px-3 py-1 text-[10px] font-black text-amber-700">
          AI写作
        </div>
        <p className="mt-3 line-clamp-2 text-[16px] font-black leading-tight tracking-[-0.04em] text-[#17213f]">
          {title}
        </p>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#6f5f40]">
          {prompt}
        </p>
      </div>
    </div>
  );
}

export function CommunityClient({
  isLoggedIn,
  initialPosts,
  initialOverview,
}: CommunityClientProps) {
  const [posts, setPosts] = useState<CommunityPost[]>(initialPosts);
  const [overview, setOverview] = useState<CommunityOverview | null>(initialOverview);
  const [activeTab, setActiveTab] = useState<CommunityTab>("精选作品");
  const [searchText, setSearchText] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(
    initialPosts.length === 0 || initialOverview === null,
  );

  useEffect(() => {
    let mounted = true;

    const loadCommunity = async () => {
      try {
        const [postsResponse, overviewResponse] = await Promise.all([
          fetch("/api/community/posts", { cache: "no-store" }),
          fetch("/api/community/overview", { cache: "no-store" }),
        ]);

        const postsPayload = (await postsResponse.json()) as { posts?: CommunityPost[] };
        const overviewPayload = (await overviewResponse.json()) as {
          overview?: CommunityOverview;
        };

        if (!mounted) {
          return;
        }

        setPosts(postsPayload.posts ?? []);
        setOverview(overviewPayload.overview ?? null);
      } catch (error) {
        console.error("【成长社区读取失败】:", error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    if (!initialPosts.length || !initialOverview) {
      void loadCommunity();
    }

    return () => {
      mounted = false;
    };
  }, [initialOverview, initialPosts.length]);

  const filteredPosts = useMemo(() => {
    let next = [...posts];

    if (activeTab === "最新作品") {
      next.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (activeTab === "最多点赞") {
      next.sort((a, b) => b.like_count - a.like_count || b.view_count - a.view_count);
    } else if (activeTab !== "精选作品") {
      next = next.filter((post) => post.category === activeTab);
    } else {
      next.sort(
        (a, b) =>
          Number(b.is_featured) - Number(a.is_featured) ||
          a.manual_sort_order - b.manual_sort_order ||
          b.like_count - a.like_count ||
          b.view_count - a.view_count,
      );
    }

    if (selectedCreatorId) {
      next = next.filter((post) => post.user_id === selectedCreatorId);
    }

    const keyword = searchText.trim().toLowerCase();
    if (keyword) {
      next = next.filter((post) =>
        [
          post.title,
          post.description ?? "",
          post.prompt,
          post.category,
          authorName(post),
          post.users?.phone ?? "",
        ]
          .join("\n")
          .toLowerCase()
          .includes(keyword),
      );
    }

    return next;
  }, [activeTab, posts, searchText, selectedCreatorId]);

  const creatorList = overview?.activeCreators ?? [];
  const creatorStars = overview?.creatorStars ?? [];
  const statCards = [
    ["已有作品", overview?.totalWorks ?? posts.length],
    ["小创作者", overview?.totalCreators ?? 0],
  ] as const;

  return (
    <section className="mt-7 grid gap-7 xl:grid-cols-[minmax(0,1fr)_356px]">
      <div className="space-y-7">
        <section className="overflow-hidden rounded-[36px] border border-white/80 bg-[linear-gradient(135deg,#ffffff_0%,#f8f3ff_42%,#eef3ff_100%)] shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl">
          <div className="relative min-h-[560px] px-7 py-7 sm:px-9 xl:min-h-[590px] xl:px-10 xl:py-8">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_22%_30%,rgba(255,255,255,0.96),rgba(255,255,255,0.78)_28%,rgba(255,255,255,0)_56%),radial-gradient(circle_at_64%_28%,rgba(161,126,255,0.18),rgba(161,126,255,0)_28%),radial-gradient(circle_at_82%_18%,rgba(255,175,210,0.28),rgba(255,175,210,0)_18%),linear-gradient(135deg,rgba(255,255,255,0.9)_0%,rgba(246,241,255,0.56)_44%,rgba(236,243,255,0.68)_100%)]" />
            <div className="pointer-events-none absolute bottom-[-28%] right-[-10%] h-[82%] w-[62%] rounded-full bg-[#8c73ff]/14 blur-[100px]" />
            <div className="pointer-events-none absolute right-[8%] top-[8%] h-[26px] w-[26px] rounded-full bg-[#ffb366]/55 blur-[2px]" />
            <div className="pointer-events-none absolute left-[18%] top-[18%] h-4 w-4 rounded-full bg-[#a77dff]/40 blur-[2px]" />
            <div className="pointer-events-none absolute left-[56%] top-[50%] h-3.5 w-3.5 rounded-full bg-[#a77dff]/55 blur-[1px]" />

            <img
              src="/community-assets/hero-kid-robot-clean.png"
              alt="社区主视觉"
              className="pointer-events-none absolute bottom-0 right-[-4%] z-10 h-[90%] max-w-none object-contain drop-shadow-[0_42px_52px_rgba(89,84,188,0.22)] sm:right-[-2%] xl:h-[94%]"
            />

            <div className="relative z-20 flex min-h-[500px] items-start pt-24 xl:min-h-[540px] xl:pt-28">
              <div className="max-w-[500px]">
                <h1 className="text-[48px] font-black leading-[0.95] tracking-[-0.06em] text-[#182140] sm:text-[60px]">
                  每一个作品
                  <span className="home-gradient-text mt-2 block">都值得被看见</span>
                </h1>
                <p className="mt-6 max-w-[30ch] text-[15px] leading-8 text-[#697493]">
                  孩子们的每一次创作，都是让世界看到的光芒。在这里，分享想法和作品，收获灵感与鼓励，和更多小创作者一起成长。
                </p>

                <div className="mt-8 grid max-w-[400px] gap-3 sm:grid-cols-2">
                  {statCards.map(([label, value], index) => (
                    <div
                      key={label}
                      className="rounded-[22px] border border-white/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(246,247,255,0.76))] px-5 py-4 shadow-[0_14px_28px_rgba(113,128,189,0.1)] backdrop-blur-md"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-[#f5f2ff] shadow-[inset_0_0_0_1px_rgba(141,121,255,0.14)]">
                          <img
                            src={
                              index === 0
                                ? "/community-assets/stat-work-icon.png"
                                : "/community-assets/stat-creator-icon.png"
                            }
                            alt=""
                            className="h-5 w-5 object-contain"
                          />
                        </span>
                        <span className="text-sm font-semibold text-[#7884a6]">{label}</span>
                      </div>
                      <p className="mt-3 text-[30px] font-black tracking-[-0.05em] text-[#182140]">
                        {formatCount(Number(value))}+
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/80 bg-white/80 p-5 shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2.5">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-full px-4 py-2.5 text-sm font-black transition ${
                    activeTab === tab
                      ? "bg-[#f0ebff] text-[#6f60ff] shadow-[inset_0_0_0_1px_rgba(123,105,255,0.22)]"
                      : "text-[#7884a6] hover:bg-[#f7f8ff] hover:text-[#253150]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center xl:self-end 2xl:self-auto">
              <label className="flex min-w-0 items-center gap-3 rounded-full border border-[#e4e7ff] bg-white px-5 py-3 text-sm text-[#687394] shadow-[0_8px_22px_rgba(111,126,188,0.08)] sm:min-w-[220px] xl:min-w-[260px]">
                <span className="text-[#9da7c7]">⌕</span>
                <input
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="搜索作品 / 创作者"
                  className="w-full bg-transparent text-[#263252] placeholder:text-[#9ca7c5] focus:outline-none"
                />
              </label>
              <Link
                href="/workshop?mode=coding"
                className="inline-flex h-12 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(90deg,#ff8cca,#b26bff)] px-5 text-sm font-black text-white shadow-[0_16px_34px_rgba(206,112,255,0.24)] transition hover:opacity-95"
              >
                上传作品
              </Link>
            </div>
          </div>

          {(searchText.trim() || selectedCreatorId) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {selectedCreatorId && (
                <button
                  type="button"
                  onClick={() => setSelectedCreatorId(null)}
                  className="rounded-full border border-[#dde3ff] bg-[#f9faff] px-4 py-2 text-sm font-semibold text-[#687394]"
                >
                  清空创作者筛选
                </button>
              )}
              {searchText.trim() && (
                <button
                  type="button"
                  onClick={() => setSearchText("")}
                  className="rounded-full border border-[#dde3ff] bg-[#f9faff] px-4 py-2 text-sm font-semibold text-[#687394]"
                >
                  清空搜索词
                </button>
              )}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {isLoading
            ? Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={`community-loading-${index}`}
                  className="overflow-hidden rounded-[24px] border border-white/80 bg-white/78 shadow-[0_16px_44px_rgba(91,111,185,0.12)]"
                >
                  <div className="aspect-[1.18/0.82] animate-pulse bg-[#e9efff]" />
                  <div className="space-y-3 px-4 py-4">
                    <div className="h-5 w-2/3 rounded-full bg-[#e6ecff]" />
                    <div className="h-4 w-full rounded-full bg-[#eef3ff]" />
                    <div className="h-4 w-3/4 rounded-full bg-[#eef3ff]" />
                  </div>
                </div>
              ))
            : filteredPosts.map((post) => {
                const name = authorName(post);
                return (
                  <article
                    key={post.id}
                    className="group overflow-hidden rounded-[24px] border border-white/80 bg-white/82 shadow-[0_18px_54px_rgba(91,111,185,0.14)] transition hover:-translate-y-1 hover:shadow-[0_24px_68px_rgba(91,111,185,0.2)]"
                  >
                    <Link href={`/community/${post.id}`} className="block">
                      <div
                        className={`relative aspect-[1.18/0.82] overflow-hidden bg-gradient-to-br ${gradientByCategory[post.category] ?? gradientByCategory["创意编程"]}`}
                      >
                        {post.mode === "writing" ? (
                          <div className="h-full w-full transition duration-500 group-hover:scale-[1.03]">
                            <WritingPostThumbnail title={post.title} prompt={post.prompt} />
                          </div>
                        ) : (
                          <>
                            <img
                              src={post.preview_image_url}
                              alt={post.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.05]"
                            />
                            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_38%,rgba(18,31,61,0.56)_100%)]" />
                          </>
                        )}
                        <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                          {post.is_featured && (
                            <span className="rounded-full bg-[#7c6cff] px-2.5 py-1 text-[10px] font-black text-white">
                              {COMMUNITY_CATEGORY_ACCENT[
                                post.category as keyof typeof COMMUNITY_CATEGORY_ACCENT
                              ] ?? "精选"}
                            </span>
                          )}
                          <span className="rounded-full bg-white/86 px-2.5 py-1 text-[10px] font-black text-[#556285]">
                            {post.category}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <div className="px-4 pb-4 pt-4">
                      <Link href={`/community/${post.id}`} className="block">
                        <p className="line-clamp-1 text-[18px] font-black tracking-[-0.04em] text-[#182140]">
                          {post.title}
                        </p>
                        <p className="mt-2 line-clamp-2 min-h-[44px] text-sm leading-6 text-[#6f7b9c]">
                          {post.description || post.prompt}
                        </p>
                      </Link>
                      <div className="mt-3 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCreatorId((current) =>
                              current === post.user_id ? null : post.user_id,
                            )
                          }
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                          style={{
                            backgroundColor: post.user_profiles?.avatar_color ?? "#7b72ff",
                          }}
                        >
                          {authorInitial(name)}
                        </button>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-[#3f4b6f]">{name}</p>
                          <p className="text-xs text-[#8a95b5]">{formatDate(post.created_at)}</p>
                        </div>
                        <div className="shrink-0 text-xs font-black text-[#6c7597]">
                          ♡ {post.like_count}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
        </section>

        {!isLoading && !filteredPosts.length && (
          <section className="rounded-[32px] border border-white/80 bg-white/80 px-8 py-16 text-center shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
            <h3 className="text-[30px] font-black tracking-[-0.05em] text-[#17213f]">
              暂时没有符合筛选条件的作品
            </h3>
            <p className="mx-auto mt-4 max-w-[34ch] text-[15px] leading-8 text-[#687394]">
              可以换个分类、清空搜索词，或者先去工坊完成第一份作品。
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("精选作品");
                  setSearchText("");
                  setSelectedCreatorId(null);
                }}
                className="rounded-full border border-[#dde3ff] bg-white px-6 py-3 text-sm font-black text-[#5d688b]"
              >
                清空筛选
              </button>
              <Link
                href="/workshop?mode=coding"
                className="rounded-full bg-[#625cff] px-6 py-3 text-sm font-black text-white"
              >
                去生成作品
              </Link>
            </div>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div className="rounded-[32px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
            <SectionTitle title="活跃创作者" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {creatorList.length ? (
                creatorList.slice(0, 5).map((creator) => (
                  <div
                    key={creator.user_id}
                    className="rounded-[22px] border border-[#edf1ff] bg-[#fffefe] px-4 py-5 text-center shadow-[0_10px_24px_rgba(113,128,189,0.08)]"
                  >
                    <div className="relative mx-auto h-20 w-20">
                      <div
                        className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(255,201,229,0.78),rgba(255,255,255,0.02)_72%)]"
                      />
                      <div
                        className="absolute inset-[6px] grid place-items-center rounded-full text-lg font-black text-white shadow-[0_10px_20px_rgba(91,111,185,0.12)]"
                        style={{ backgroundColor: creator.avatar_color ?? "#7b72ff" }}
                      >
                        {authorInitial(creator.name)}
                      </div>
                    </div>
                    <p className="mt-4 truncate text-[17px] font-black text-[#17213f]">
                      {creator.name}
                    </p>
                    <p className="mt-2 text-xs text-[#8290b1]">
                      作品 {creator.works_count} · 点赞 {creator.total_likes}
                    </p>
                    <p className="mt-3 line-clamp-1 text-sm text-[#6d789a]">
                      {creator.categories[0] ?? "创意编程"}
                    </p>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCreatorId((current) =>
                          current === creator.user_id ? null : creator.user_id,
                        )
                      }
                      className={`mt-4 inline-flex h-10 items-center justify-center rounded-full px-5 text-sm font-black transition ${
                        selectedCreatorId === creator.user_id
                          ? "bg-[#efeaff] text-[#6d5dff]"
                          : "border border-[#e3e8ff] bg-white text-[#647092] hover:border-[#cad2ff]"
                      }`}
                    >
                      {selectedCreatorId === creator.user_id ? "已筛选" : "关注"}
                    </button>
                  </div>
                ))
              ) : (
                <div className="rounded-[22px] border border-dashed border-[#d6def8] bg-white/64 px-5 py-8 text-center text-[#7380a4] sm:col-span-2 lg:col-span-5">
                  第一批创作者正在路上，作品通过审核后这里会自动亮起来。
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[32px] border border-white/80 bg-white/82 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)]">
            <SectionTitle
              title="创作之星榜"
              action={
                <button
                  type="button"
                  className="rounded-full border border-[#e2e6ff] bg-white px-4 py-2 text-xs font-black text-[#7480a2]"
                >
                  查看更多
                </button>
              }
            />
            <p className="mt-2 text-sm text-[#7b87a9]">每周更新，点亮点赞靠前的创作者。</p>
            <div className="mt-6 space-y-3">
              {(creatorStars.length ? creatorStars : creatorList.slice(0, 5)).map(
                (creator, index) => (
                  <button
                    key={`${creator.user_id}-${index}`}
                    type="button"
                    onClick={() => setSelectedCreatorId(creator.user_id)}
                    className="flex w-full items-center gap-4 rounded-[20px] border border-[#edf1ff] bg-[#fffefe] px-4 py-4 text-left shadow-[0_10px_22px_rgba(113,128,189,0.06)] transition hover:border-[#d7deff]"
                  >
                    <div className="w-7 text-center text-[20px] font-black text-[#8c82ff]">
                      {index + 1}
                    </div>
                    <div
                      className="grid h-11 w-11 place-items-center rounded-full text-sm font-black text-white"
                      style={{ backgroundColor: creator.avatar_color ?? "#7b72ff" }}
                    >
                      {authorInitial(creator.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-black text-[#17213f]">
                        {creator.name}
                      </p>
                      <p className="mt-1 text-sm text-[#7782a4]">
                        本周获得 {creator.total_likes} 赞
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-[#687394]">
                      {creator.works_count} 件
                    </p>
                  </button>
                ),
              )}
            </div>
          </div>
        </section>

      </div>

      <aside className="space-y-6">
        <section className="overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,#fbf7ff_0%,#f3edff_48%,#efeaff_100%)] p-6 shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl">
          <h3 className="max-w-[12ch] text-[32px] font-black leading-[1.02] tracking-[-0.05em] text-[#182140]">
            社区创作规则
          </h3>
          <div className="mt-5 overflow-hidden rounded-[24px] border border-white/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.62),rgba(255,255,255,0.4))] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.44)]">
            {inspirationNotes.map((note, index) => (
              <div
                key={note}
                className={`flex items-start gap-3 px-4 py-3.5 ${
                  index !== inspirationNotes.length - 1 ? "border-b border-white/60" : ""
                }`}
              >
                <div
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-black ${
                    index === 0
                      ? "bg-[#efe8ff] text-[#7e68ff]"
                      : index === 1
                        ? "bg-[#ffe9f4] text-[#ff73b2]"
                        : index === 2
                          ? "bg-[#e8f4ff] text-[#5799ff]"
                          : "bg-[#f3efff] text-[#8b74ff]"
                  }`}
                >
                  {index + 1}
                </div>
                <p className="text-sm leading-7 text-[#647091]">{note}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <Link
              href="/community/rules"
              className="inline-flex h-11 flex-1 items-center justify-center rounded-full bg-[linear-gradient(90deg,#ff8cca,#b26bff)] text-sm font-black text-white shadow-[0_14px_30px_rgba(199,108,255,0.22)]"
            >
              查看详细规则
            </Link>
            <Link
              href="/workshop?mode=coding"
              className="inline-flex h-11 items-center justify-center rounded-full border border-[#dddfff] bg-white/86 px-4 text-sm font-black text-[#5e6790]"
            >
              去创作
            </Link>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/80 bg-white/82 p-6 shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl">
          <SectionTitle title="分类说明" />
          <div className="mt-5 space-y-3">
            {visibleCategoryLabels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(label)}
                className={`w-full rounded-[20px] border px-4 py-4 text-left transition ${
                  activeTab === label
                    ? "border-[#8c82ff] bg-[#f0edff]"
                    : "border-[#e3e9ff] bg-white hover:border-[#cbd5ff]"
                }`}
              >
                <p className="text-[15px] font-black text-[#17213f]">{label}</p>
                <p className="mt-2 text-sm leading-7 text-[#687394]">
                  {COMMUNITY_CATEGORY_DESCRIPTIONS[label]}
                </p>
              </button>
            ))}
          </div>
        </section>

      </aside>
    </section>
  );
}
