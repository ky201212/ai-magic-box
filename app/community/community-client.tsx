"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  title: string;
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

const tabs: CommunityTab[] = [
  "精选作品",
  "最新作品",
  "最多点赞",
  ...COMMUNITY_CATEGORY_LABELS,
];

const gradientByCategory: Record<string, string> = {
  创意编程: "from-[#718bff] via-[#8ddaff] to-[#c6f3ff]",
  绘画设计: "from-[#ff8eca] via-[#ffb8dc] to-[#ffe2f0]",
  故事写作: "from-[#8277ff] via-[#b9c8ff] to-[#edf1ff]",
  视频动画: "from-[#ffad83] via-[#ffc66d] to-[#fff0bf]",
  音乐创作: "from-[#66c7ff] via-[#8ddaff] to-[#ddf8ff]",
  科学实验: "from-[#8f7dff] via-[#ff9bd3] to-[#ffe4f2]",
};

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
      return;
    }

    setIsLoading(false);

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
    ["创作者", overview?.totalCreators ?? 0],
    ["累计点赞", overview?.displayTotalLikes ?? 0],
    ["总浏览", overview?.totalViews ?? 0],
    ["总分享", overview?.totalShares ?? 0],
  ];

  return (
    <>
      <section className="pt-12">
        <div className="max-w-[1440px]">
          <div className="inline-flex rounded-full border border-[#d9e2ff] bg-white/72 px-4 py-2 text-xs font-black tracking-[0.18em] text-[#6875a5] shadow-[0_12px_34px_rgba(112,138,215,0.12)]">
            成长社区
          </div>
          <h1 className="community-art-title mt-9 flex flex-col gap-5 font-black leading-none tracking-normal text-[#151f3d] sm:gap-6 lg:gap-7 xl:gap-8">
            <span className="community-art-title-line block text-[58px] sm:text-[82px] lg:text-[104px] xl:text-[126px] 2xl:text-[142px]">
              每一个作品
            </span>
            <span className="community-art-title-line home-gradient-text block pl-1 text-[68px] sm:pl-2 sm:text-[98px] lg:pl-4 lg:text-[126px] xl:pl-6 xl:text-[154px] 2xl:text-[176px]">
              都值得被看见
            </span>
          </h1>
        </div>
      </section>

      <section className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map(([label, value]) => (
          <div
            key={label}
            className="relative overflow-hidden rounded-[24px] border border-white/80 bg-white/74 px-5 py-5 shadow-[0_14px_42px_rgba(91,111,185,0.12)] backdrop-blur-2xl"
          >
            <div className="absolute right-[-18px] top-[-18px] h-20 w-20 rounded-full bg-[#e9ddff]" />
            <p className="relative text-sm font-semibold text-[#7380a4]">{label}</p>
            <p className="relative mt-3 text-[32px] font-black tracking-[-0.05em] text-[#17213f]">
              {formatCount(Number(value))}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-10">
        <div className="flex flex-col gap-5 rounded-[28px] border border-white/80 bg-white/76 p-5 shadow-[0_20px_60px_rgba(91,111,185,0.14)] backdrop-blur-2xl xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-wrap gap-2.5">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full border px-4 py-2.5 text-[14px] font-black transition ${
                  activeTab === tab
                    ? "border-[#8c82ff] bg-[#625cff] text-white shadow-[0_12px_24px_rgba(98,92,255,0.2)]"
                    : "border-[#dce5ff] bg-white/76 text-[#657195] hover:border-[#bccaff] hover:text-[#263252]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-full border border-[#dce5ff] bg-white px-5 py-3 text-sm text-[#687394] sm:min-w-[340px] xl:min-w-[420px]">
              <span className="text-[#9aa5c5]">⌕</span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="搜索作品、提示词、创作者或手机号"
                className="w-full bg-transparent text-[#273252] placeholder:text-[#9ca7c5] focus:outline-none"
              />
            </label>
            <Link
              href="/workshop?mode=coding"
              className="inline-flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-full bg-[#ff8fbd] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(255,143,189,0.22)] transition hover:bg-[#f178ad]"
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
                className="rounded-full border border-[#dce5ff] bg-white px-4 py-2 text-sm font-semibold text-[#687394]"
              >
                清空创作者筛选
              </button>
            )}
            {searchText.trim() && (
              <button
                type="button"
                onClick={() => setSearchText("")}
                className="rounded-full border border-[#dce5ff] bg-white px-4 py-2 text-sm font-semibold text-[#687394]"
              >
                清空搜索词
              </button>
            )}
          </div>
        )}
      </section>

      <section className="mt-8 grid gap-8 2xl:grid-cols-[minmax(0,1fr)_390px]">
        <div className="space-y-8">
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {isLoading
              ? Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`community-loading-${index}`}
                    className="overflow-hidden rounded-[26px] border border-white/80 bg-white/70 shadow-[0_16px_44px_rgba(91,111,185,0.12)]"
                  >
                    <div className="aspect-[1.18/1] animate-pulse bg-[#e9efff]" />
                    <div className="space-y-4 px-5 py-5">
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
                      className="group overflow-hidden rounded-[26px] border border-white/80 bg-white/78 shadow-[0_18px_54px_rgba(91,111,185,0.14)] backdrop-blur-2xl transition hover:-translate-y-1 hover:shadow-[0_28px_72px_rgba(91,111,185,0.2)]"
                    >
                      <Link href={`/community/${post.id}`} className="block">
                        <div
                          className={`relative aspect-[1.18/1] overflow-hidden bg-gradient-to-br ${gradientByCategory[post.category] ?? gradientByCategory["创意编程"]}`}
                        >
                          <img
                            src={post.preview_image_url}
                            alt={post.title}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                          />
                          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0)_38%,rgba(18,31,61,0.58)_100%)]" />
                          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                            <span className="rounded-full bg-white/84 px-3 py-1 text-[11px] font-black text-[#4d5a82] shadow-[0_8px_18px_rgba(27,39,75,0.12)]">
                              {post.category}
                            </span>
                            {post.is_featured && (
                              <span className="rounded-full bg-[#625cff] px-3 py-1 text-[11px] font-black text-white shadow-[0_8px_18px_rgba(98,92,255,0.18)]">
                                {COMMUNITY_CATEGORY_ACCENT[
                                  post.category as keyof typeof COMMUNITY_CATEGORY_ACCENT
                                ] ?? "推荐"}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="px-5 pb-4 pt-5">
                          <p className="line-clamp-2 text-[21px] font-black leading-[1.2] tracking-[-0.035em] text-[#17213f]">
                            {post.title}
                          </p>
                          <p className="mt-3 line-clamp-3 text-sm leading-7 text-[#6a7596]">
                            {post.prompt}
                          </p>
                        </div>
                      </Link>

                      <div className="px-5 pb-5">
                        <div className="flex items-center gap-3 border-t border-[#edf1ff] pt-4">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedCreatorId((current) =>
                                current === post.user_id ? null : post.user_id,
                              )
                            }
                            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-black text-white shadow-[0_10px_20px_rgba(91,111,185,0.16)]"
                            style={{
                              backgroundColor: post.user_profiles?.avatar_color ?? "#7b72ff",
                            }}
                          >
                            {authorInitial(name)}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-[#3f4b6f]">
                              @{name}
                            </p>
                            <p className="mt-1 text-xs text-[#8a95b5]">
                              {formatDate(post.created_at)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2 text-xs font-black text-[#687394]">
                            <span>赞 {post.like_count}</span>
                            <span>看 {post.view_count}</span>
                            <span>享 {post.share_count}</span>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
          </section>

          {!isLoading && !filteredPosts.length && (
            <section className="rounded-[28px] border border-white/80 bg-white/76 px-8 py-16 text-center shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
              <h3 className="text-[32px] font-black tracking-[-0.05em] text-[#17213f]">
                暂时没有符合筛选条件的作品
              </h3>
              <p className="mx-auto mt-4 max-w-[36ch] text-[16px] leading-8 text-[#687394]">
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
                  className="rounded-full border border-[#dce5ff] bg-white px-6 py-3 text-sm font-black text-[#5d688b]"
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

          <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
            <div className="rounded-[28px] border border-white/80 bg-white/76 px-6 py-7 shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h3 className="text-[30px] font-black tracking-[-0.05em] text-[#17213f]">
                    活跃创作者
                  </h3>
                  <p className="mt-2 text-sm text-[#7782a4]">
                    跟随后台排序和真实互动数据变化。
                  </p>
                </div>
                {selectedCreatorId && (
                  <button
                    type="button"
                    onClick={() => setSelectedCreatorId(null)}
                    className="rounded-full border border-[#dce5ff] bg-white px-4 py-2 text-sm font-semibold text-[#687394]"
                  >
                    清空筛选
                  </button>
                )}
              </div>

              <div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {creatorList.length ? (
                  creatorList.map((creator) => (
                    <button
                      key={creator.user_id}
                      type="button"
                      onClick={() =>
                        setSelectedCreatorId((current) =>
                          current === creator.user_id ? null : creator.user_id,
                        )
                      }
                      className={`rounded-[22px] border px-5 py-5 text-left transition hover:-translate-y-0.5 ${
                        selectedCreatorId === creator.user_id
                          ? "border-[#8c82ff] bg-[#f0edff]"
                          : "border-[#e3e9ff] bg-white/72 hover:border-[#cbd5ff]"
                      }`}
                    >
                      <div
                        className="grid h-14 w-14 place-items-center rounded-full text-lg font-black text-white"
                        style={{ backgroundColor: creator.avatar_color ?? "#7b72ff" }}
                      >
                        {authorInitial(creator.name)}
                      </div>
                      <p className="mt-4 truncate text-[18px] font-black text-[#17213f]">
                        {creator.name}
                      </p>
                      <p className="mt-2 text-sm text-[#7782a4]">
                        作品 {creator.works_count} · 点赞 {creator.total_likes}
                      </p>
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#687394]">
                        {creator.categories.join(" / ")}
                      </p>
                    </button>
                  ))
                ) : (
                  <div className="rounded-[22px] border border-dashed border-[#d6def8] bg-white/64 px-5 py-8 text-center text-[#7380a4] sm:col-span-2 xl:col-span-3">
                    第一批创作者正在路上，作品通过审核后这里会自动亮起来。
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/80 bg-white/76 px-6 py-7 shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
              <h3 className="text-[30px] font-black tracking-[-0.05em] text-[#17213f]">
                创作之星榜
              </h3>
              <p className="mt-2 text-sm text-[#7782a4]">
                后台可手动排序，也可以跟随互动数据。
              </p>

              <div className="mt-7 space-y-3">
                {(creatorStars.length ? creatorStars : creatorList.slice(0, 6)).map(
                  (creator, index) => (
                    <button
                      key={`${creator.user_id}-${index}`}
                      type="button"
                      onClick={() => setSelectedCreatorId(creator.user_id)}
                      className="flex w-full items-center gap-4 rounded-[22px] border border-[#e3e9ff] bg-white/72 px-4 py-4 text-left transition hover:border-[#cbd5ff]"
                    >
                      <div className="w-8 text-center text-[22px] font-black text-[#8c82ff]">
                        {index + 1}
                      </div>
                      <div
                        className="grid h-11 w-11 place-items-center rounded-full text-sm font-black text-white"
                        style={{ backgroundColor: creator.avatar_color ?? "#7b72ff" }}
                      >
                        {authorInitial(creator.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[17px] font-black text-[#17213f]">
                          {creator.name}
                        </p>
                        <p className="mt-1 text-sm text-[#7782a4]">
                          点赞 {creator.total_likes} · 浏览 {creator.total_views}
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
          <section className="rounded-[28px] border border-white/80 bg-white/76 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
            <p className="text-[13px] font-black tracking-[0.16em] text-[#7782a4]">
              分类说明
            </p>
            <div className="mt-5 space-y-3">
              {COMMUNITY_CATEGORY_LABELS.map((label) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setActiveTab(label)}
                  className={`w-full rounded-[20px] border px-4 py-4 text-left transition ${
                    activeTab === label
                      ? "border-[#8c82ff] bg-[#f0edff]"
                      : "border-[#e3e9ff] bg-white/70 hover:border-[#cbd5ff]"
                  }`}
                >
                  <p className="text-[16px] font-black text-[#17213f]">{label}</p>
                  <p className="mt-2 text-sm leading-7 text-[#687394]">
                    {COMMUNITY_CATEGORY_DESCRIPTIONS[label]}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="rounded-[28px] border border-white/80 bg-white/76 p-6 shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
            <p className="text-[13px] font-black tracking-[0.16em] text-[#7782a4]">
              快速入口
            </p>
            <div className="mt-5 grid gap-3">
              <Link
                href={isLoggedIn ? "/profile" : "/login?redirect=/profile"}
                className="rounded-[22px] border border-[#e3e9ff] bg-white/72 px-5 py-5 text-left transition hover:border-[#cbd5ff]"
              >
                <p className="text-[18px] font-black text-[#17213f]">
                  {isLoggedIn ? "查看我的投稿状态" : "先登录，再管理作品"}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#687394]">
                  进入个人主页，查看审核进度、魔法币变化和作品状态。
                </p>
              </Link>
              <Link
                href="/workshop?mode=coding"
                className="rounded-[22px] border border-[#e3e9ff] bg-white/72 px-5 py-5 text-left transition hover:border-[#cbd5ff]"
              >
                <p className="text-[18px] font-black text-[#17213f]">去工坊继续创作</p>
                <p className="mt-2 text-sm leading-7 text-[#687394]">
                  生成新的作品，然后继续分享到社区。
                </p>
              </Link>
            </div>
          </section>
        </aside>
      </section>
    </>
  );
}
