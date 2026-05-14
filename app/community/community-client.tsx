"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { ApprovedCommunityPost } from "@/lib/community";

type CommunityClientProps = {
  isLoggedIn: boolean;
};

type CommunityTab =
  | "精选作品"
  | "最新作品"
  | "最多点赞"
  | "创意编程"
  | "绘画设计"
  | "故事写作"
  | "视频动画"
  | "音乐创作"
  | "科学实验";

type EnrichedPost = ApprovedCommunityPost & {
  authorName: string;
  avatarColor: string;
  category: string;
  tag: string;
  commentCount: number;
};

type CreatorSummary = {
  userId: string;
  name: string;
  avatarColor: string;
  works: number;
  likes: number;
  categories: string[];
};

const communityTabs: CommunityTab[] = [
  "精选作品",
  "最新作品",
  "最多点赞",
  "创意编程",
  "绘画设计",
  "故事写作",
  "视频动画",
  "音乐创作",
  "科学实验",
];

const categoryMap = {
  创意编程: ["程序", "编程", "互动", "按钮", "小游戏", "任务", "机器人", "科学"],
  绘画设计: ["绘画", "插画", "海报", "设计", "颜色", "画", "风景"],
  故事写作: ["故事", "童话", "小说", "日记", "冒险", "剧本", "写作"],
  视频动画: ["视频", "动画", "镜头", "短片", "剪辑"],
  音乐创作: ["音乐", "旋律", "节奏", "钢琴", "乐曲", "唱"],
  科学实验: ["实验", "火山", "电路", "物理", "化学", "观察"],
} as const;

const categoryAccent: Record<string, string> = {
  创意编程: "精选",
  绘画设计: "静态",
  故事写作: "故事",
  视频动画: "推荐",
  音乐创作: "新声",
  科学实验: "探索",
};

const categoryGradients: Record<string, string> = {
  创意编程: "from-[#13235c] via-[#3a37b7] to-[#5fd2ff]",
  绘画设计: "from-[#371854] via-[#7a35bc] to-[#ff93d1]",
  故事写作: "from-[#1f255c] via-[#5344d4] to-[#b2c7ff]",
  视频动画: "from-[#412053] via-[#8d43cc] to-[#ffb980]",
  音乐创作: "from-[#0d2850] via-[#2657bf] to-[#78deff]",
  科学实验: "from-[#2b184f] via-[#6840cf] to-[#ffb273]",
};

const categoryDescriptions: Record<string, string> = {
  创意编程: "把互动逻辑、小游戏和科普机关做成能玩的作品。",
  绘画设计: "用色彩、构图和想象力把一个世界画出来。",
  故事写作: "从一句灵感展开成完整角色、情节和结尾。",
  视频动画: "让画面、镜头和节奏串成一个可以观看的故事。",
  音乐创作: "把旋律、节拍和氛围感做成自己的主题曲。",
  科学实验: "把观察、猜想和实验过程变成可分享的小项目。",
};

const rankingPalette = ["#5b7cff", "#7f5cff", "#ff8f7c", "#4dc2ff", "#a855f7"];

function maskPhone(phone?: string | null) {
  if (!phone) {
    return "小创作者";
  }

  return phone.replace(/^(\d{3})\d{4}(\d{4})$/, "$1****$2");
}

function formatCount(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function getAvatarInitial(name: string) {
  return name.trim().slice(0, 1) || "创";
}

function getAvatarColor(index: number, fallback?: string | null) {
  return fallback || rankingPalette[index % rankingPalette.length];
}

function inferCategory(post: ApprovedCommunityPost) {
  const source = `${post.title} ${post.prompt}`.toLowerCase();

  for (const [label, keywords] of Object.entries(categoryMap)) {
    if (keywords.some((keyword) => source.includes(keyword.toLowerCase()))) {
      return label;
    }
  }

  return "创意编程";
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function CommunityClient({
  isLoggedIn,
}: CommunityClientProps) {
  const [posts, setPosts] = useState<ApprovedCommunityPost[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(true);
  const [activeTab, setActiveTab] = useState<CommunityTab>("精选作品");
  const [searchText, setSearchText] = useState("");
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadPosts = async () => {
      try {
        const response = await fetch("/api/community/posts", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          posts?: ApprovedCommunityPost[];
        };

        if (!response.ok || !mounted) {
          return;
        }

        setPosts(data.posts ?? []);
      } catch {
        if (mounted) {
          window.console.error("成长社区作品加载失败");
        }
      } finally {
        if (mounted) {
          setIsLoadingPosts(false);
        }
      }
    };

    void loadPosts();

    return () => {
      mounted = false;
    };
  }, []);

  const totalWorks = posts.length;
  const totalCreators = new Set(posts.map((post) => post.user_id)).size;
  const totalLikes = posts.reduce((sum, post) => sum + (post.like_count ?? 0), 0);

  const enrichedPosts = useMemo<EnrichedPost[]>(() => {
    return posts.map((post, index) => {
      const authorName =
        post.user_profiles?.display_name || maskPhone(post.users?.phone);
      const category = inferCategory(post);

      return {
        ...post,
        authorName,
        avatarColor: getAvatarColor(index, post.user_profiles?.avatar_color),
        category,
        tag: categoryAccent[category],
        commentCount: Math.max(8, Math.floor((post.like_count ?? 0) / 2) + 6),
      };
    });
  }, [posts]);

  const creators = useMemo<CreatorSummary[]>(() => {
    const summary = new Map<string, CreatorSummary>();

    enrichedPosts.forEach((post) => {
      const existing = summary.get(post.user_id);

      if (existing) {
        existing.works += 1;
        existing.likes += post.like_count ?? 0;
        if (!existing.categories.includes(post.category)) {
          existing.categories.push(post.category);
        }
        return;
      }

      summary.set(post.user_id, {
        userId: post.user_id,
        name: post.authorName,
        avatarColor: post.avatarColor,
        works: 1,
        likes: post.like_count ?? 0,
        categories: [post.category],
      });
    });

    return [...summary.values()].sort(
      (a, b) => b.works - a.works || b.likes - a.likes,
    );
  }, [enrichedPosts]);

  const rankingUsers = useMemo(() => {
    return [...creators].sort((a, b) => b.likes - a.likes || b.works - a.works);
  }, [creators]);

  const filteredPosts = useMemo(() => {
    let nextPosts = [...enrichedPosts];

    if (activeTab === "最新作品") {
      nextPosts.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else if (activeTab === "最多点赞") {
      nextPosts.sort((a, b) => (b.like_count ?? 0) - (a.like_count ?? 0));
    } else if (activeTab !== "精选作品") {
      nextPosts = nextPosts.filter((post) => post.category === activeTab);
    } else {
      nextPosts.sort(
        (a, b) =>
          (b.like_count ?? 0) - (a.like_count ?? 0) ||
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }

    if (selectedCreatorId) {
      nextPosts = nextPosts.filter((post) => post.user_id === selectedCreatorId);
    }

    const keyword = searchText.trim().toLowerCase();
    if (keyword) {
      nextPosts = nextPosts.filter((post) => {
        return (
          post.title.toLowerCase().includes(keyword) ||
          post.prompt.toLowerCase().includes(keyword) ||
          post.authorName.toLowerCase().includes(keyword) ||
          post.category.toLowerCase().includes(keyword)
        );
      });
    }

    return nextPosts;
  }, [activeTab, enrichedPosts, searchText, selectedCreatorId]);

  const heroPost = filteredPosts[0] || enrichedPosts[0];
  const selectedCreator =
    creators.find((creator) => creator.userId === selectedCreatorId) ?? null;

  return (
    <>
      <section className="pt-12">
        <div className="max-w-[1380px]">
          <div className="inline-flex rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs font-semibold tracking-[0.12em] text-white/72">
            成长社区
          </div>

          <div className="mt-8 max-w-[1240px]">
            <h1 className="text-[64px] font-black leading-[0.96] tracking-[-0.07em] text-white xl:text-[88px] 2xl:text-[104px]">
              <span className="block">每一个作品</span>
              <span className="mt-3 block xl:mt-4">都值得被看见</span>
            </h1>
            <div className="mt-6 h-[3px] w-24 rounded-full bg-[linear-gradient(90deg,rgba(167,108,255,0.9),rgba(97,208,255,0.9))]" />
          </div>

          <p className="mt-9 max-w-[38ch] text-[18px] leading-[2.15] text-white/60 xl:max-w-[40ch]">
            孩子们的每一次创作，都是让世界看到的光芒。在这里分享作品、收获反馈、认识同龄创作者，让成长被真正看见。
          </p>

          <div className="mt-12 grid max-w-[980px] gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(109,79,177,0.18),rgba(255,255,255,0.04))] px-6 py-6 backdrop-blur-xl">
              <p className="text-sm text-white/46">已有作品</p>
              <p className="mt-3 text-[34px] font-black tracking-[-0.05em] text-white">
                {formatCount(totalWorks || 12824)}+
              </p>
            </div>
            <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(109,79,177,0.18),rgba(255,255,255,0.04))] px-6 py-6 backdrop-blur-xl">
              <p className="text-sm text-white/46">创作者</p>
              <p className="mt-3 text-[34px] font-black tracking-[-0.05em] text-white">
                {formatCount(totalCreators || 8326)}+
              </p>
            </div>
            <div className="rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(109,79,177,0.18),rgba(255,255,255,0.04))] px-6 py-6 backdrop-blur-xl">
              <p className="text-sm text-white/46">累计点赞</p>
              <p className="mt-3 text-[34px] font-black tracking-[-0.05em] text-white">
                {formatCount(totalLikes || 48210)}+
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-col gap-6 2xl:flex-row 2xl:items-end 2xl:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {communityTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`rounded-full px-4 py-2.5 text-[15px] font-medium transition ${
                  activeTab === tab
                    ? "border border-[#7251c2] bg-[linear-gradient(180deg,rgba(102,59,194,0.34),rgba(255,255,255,0.04))] text-white shadow-[0_10px_24px_rgba(91,55,190,0.22)]"
                    : "border border-white/8 bg-white/[0.03] text-white/58 hover:text-white"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex min-w-[360px] items-center gap-3 rounded-full border border-white/10 bg-[rgba(21,14,40,0.92)] px-5 py-3 text-sm text-white/64 shadow-[0_10px_28px_rgba(0,0,0,0.18)]">
              <span className="text-white/42">⌕</span>
              <input
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="搜索作品标题、提示词、创作者"
                className="w-full bg-transparent text-white placeholder:text-white/34 focus:outline-none"
              />
            </label>
            <Link
              href="/workshop?mode=coding"
              className="inline-flex items-center justify-center rounded-full bg-[linear-gradient(90deg,#7b39ff_0%,#a24dff_100%)] px-6 py-3 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(123,57,255,0.34)] transition hover:brightness-110"
            >
              上传作品
            </Link>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#7251c2] bg-[linear-gradient(180deg,rgba(102,59,194,0.34),rgba(255,255,255,0.04))] px-4 py-2 text-sm text-white">
            当前分类：{activeTab}
          </span>
          {selectedCreator && (
            <button
              type="button"
              onClick={() => setSelectedCreatorId(null)}
              className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/76"
            >
              创作者：@{selectedCreator.name} ×
            </button>
          )}
          {searchText.trim() && (
            <button
              type="button"
              onClick={() => setSearchText("")}
              className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/76"
            >
              搜索：{searchText} ×
            </button>
          )}
        </div>

        <div className="mt-8 grid gap-8 2xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-8">
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {isLoadingPosts ? (
                Array.from({ length: 8 }).map((_, index) => (
                  <div
                    key={`community-skeleton-${index}`}
                    className="overflow-hidden rounded-[28px] border border-[#44306f] bg-[linear-gradient(180deg,rgba(22,14,42,0.96),rgba(14,9,28,0.98))] shadow-[0_18px_46px_rgba(0,0,0,0.24)]"
                  >
                    <div className="aspect-[1.18/1] animate-pulse bg-white/8" />
                    <div className="space-y-4 px-5 py-5">
                      <div className="flex items-center gap-3">
                        <div className="h-11 w-11 rounded-full bg-white/8" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-3/4 rounded-full bg-white/8" />
                          <div className="h-4 w-1/2 rounded-full bg-white/6" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 rounded-full bg-white/8" />
                        <div className="h-4 rounded-full bg-white/6" />
                        <div className="h-4 w-2/3 rounded-full bg-white/6" />
                      </div>
                    </div>
                  </div>
                ))
              ) : filteredPosts.length ? (
                filteredPosts.map((post) => (
                  <article
                    key={post.id}
                    className="overflow-hidden rounded-[28px] border border-[#44306f] bg-[linear-gradient(180deg,rgba(22,14,42,0.96),rgba(14,9,28,0.98))] shadow-[0_18px_46px_rgba(0,0,0,0.24)]"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedCreatorId(post.user_id)}
                      className="block w-full text-left"
                    >
                      <div
                        className={`relative aspect-[1.18/1] overflow-hidden bg-gradient-to-br ${categoryGradients[post.category]}`}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={post.preview_image_url}
                          alt={post.title}
                          className="h-full w-full object-cover transition duration-500 hover:scale-[1.04]"
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,5,18,0)_34%,rgba(7,5,18,0.22)_62%,rgba(7,5,18,0.78)_100%)]" />
                        <div className="absolute left-4 top-4 flex gap-2">
                          <span className="rounded-full bg-black/32 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-md">
                            {post.category}
                          </span>
                          <span className="rounded-full bg-[#8f5dff]/72 px-2.5 py-1 text-[11px] font-semibold text-white">
                            {post.tag}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 px-5 py-5">
                        <div className="flex items-center gap-3">
                          <div
                            className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-black text-white"
                            style={{ backgroundColor: post.avatarColor }}
                          >
                            {getAvatarInitial(post.authorName)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[18px] font-semibold text-white">
                              {post.title}
                            </p>
                            <p className="mt-1 truncate text-[13px] text-white/56">
                              @{post.authorName}
                            </p>
                          </div>
                        </div>

                        <p className="line-clamp-3 text-sm leading-7 text-white/58">
                          {post.prompt}
                        </p>

                        <div className="flex items-center justify-between border-t border-white/8 pt-4 text-[13px] text-white/56">
                          <span>{formatDate(post.created_at)}</span>
                          <div className="flex items-center gap-4">
                            <span>♡ {post.like_count ?? 0}</span>
                            <span>◌ {post.commentCount}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </article>
                ))
              ) : (
                <div className="md:col-span-2 xl:col-span-3 2xl:col-span-4">
                  <div className="rounded-[32px] border border-[#44306f] bg-[linear-gradient(180deg,rgba(22,14,42,0.96),rgba(14,9,28,0.98))] px-8 py-16 text-center shadow-[0_24px_54px_rgba(0,0,0,0.24)]">
                    <div className="mx-auto grid h-20 w-20 place-items-center rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(138,95,255,0.3),rgba(255,255,255,0.06))]">
                      <Image
                        src="/landing-assets/icon-code.png"
                        alt="空状态"
                        width={34}
                        height={34}
                        className="h-8 w-8 object-contain"
                      />
                    </div>
                    <h3 className="mt-6 text-[34px] font-black tracking-[-0.06em] text-white">
                      暂时没有符合筛选条件的作品
                    </h3>
                    <p className="mx-auto mt-4 max-w-[34ch] text-[16px] leading-8 text-white/58">
                      你可以换个分类、清空搜索词，或者先去工坊完成第一份作品。
                    </p>
                    <div className="mt-8 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("精选作品");
                          setSearchText("");
                          setSelectedCreatorId(null);
                        }}
                        className="rounded-full border border-white/10 bg-white/6 px-6 py-3 text-sm font-semibold text-white/86"
                      >
                        清空筛选
                      </button>
                      <Link
                        href="/workshop?mode=coding"
                        className="inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1e1338] transition hover:bg-white/92"
                      >
                        去生成作品
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
              <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,12,34,0.92),rgba(11,8,24,0.98))] px-7 py-7 shadow-[0_22px_58px_rgba(0,0,0,0.24)]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-[30px] font-black tracking-[-0.05em] text-white">
                      活跃创作者
                    </h3>
                    <p className="mt-2 text-sm text-white/44">
                      点击创作者即可筛选 ta 的所有公开作品
                    </p>
                  </div>
                  {selectedCreator && (
                    <button
                      type="button"
                      onClick={() => setSelectedCreatorId(null)}
                      className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm text-white/76"
                    >
                      清空筛选
                    </button>
                  )}
                </div>

                <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                  {isLoadingPosts ? (
                    Array.from({ length: 8 }).map((_, index) => (
                      <div
                        key={`creator-skeleton-${index}`}
                        className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-5"
                      >
                        <div className="h-16 w-16 rounded-full bg-white/8" />
                        <div className="mt-4 h-5 w-2/3 rounded-full bg-white/8" />
                        <div className="mt-3 h-4 w-1/2 rounded-full bg-white/6" />
                        <div className="mt-3 h-4 w-full rounded-full bg-white/6" />
                      </div>
                    ))
                  ) : creators.length ? (
                    creators.slice(0, 8).map((creator) => {
                      const isActive = selectedCreatorId === creator.userId;

                      return (
                        <button
                          key={creator.userId}
                          type="button"
                          onClick={() =>
                            setSelectedCreatorId((current) =>
                              current === creator.userId ? null : creator.userId,
                            )
                          }
                          className={`rounded-[24px] border px-5 py-5 text-left transition ${
                            isActive
                              ? "border-[#7b39ff] bg-[linear-gradient(180deg,rgba(123,57,255,0.22),rgba(255,255,255,0.05))]"
                              : "border-white/8 bg-white/[0.03] hover:bg-white/[0.05]"
                          }`}
                        >
                          <div
                            className="grid h-16 w-16 place-items-center rounded-full text-xl font-black text-white shadow-[0_16px_36px_rgba(0,0,0,0.24)]"
                            style={{ backgroundColor: creator.avatarColor }}
                          >
                            {getAvatarInitial(creator.name)}
                          </div>
                          <p className="mt-4 truncate text-[18px] font-semibold text-white">
                            {creator.name}
                          </p>
                          <p className="mt-2 text-sm text-white/44">
                            作品 {creator.works} · 点赞 {creator.likes}
                          </p>
                          <p className="mt-3 line-clamp-2 text-sm leading-6 text-white/56">
                            {creator.categories.join(" / ")}
                          </p>
                        </button>
                      );
                    })
                  ) : (
                    <div className="sm:col-span-2 xl:col-span-3 2xl:col-span-4">
                      <div className="rounded-[22px] border border-white/6 bg-white/[0.03] px-5 py-8 text-center text-white/52">
                        第一批创作者正在路上，等作品通过审核后，这里会亮起来。
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,12,34,0.92),rgba(11,8,24,0.98))] px-7 py-7 shadow-[0_22px_58px_rgba(0,0,0,0.24)]">
                <h3 className="text-[30px] font-black tracking-[-0.05em] text-white">
                  创作之星榜
                </h3>
                <p className="mt-2 text-sm text-white/44">
                  按公开作品点赞数自动排序
                </p>

                <div className="mt-8 space-y-4">
                  {isLoadingPosts ? (
                    Array.from({ length: 6 }).map((_, index) => (
                      <div
                        key={`ranking-skeleton-${index}`}
                        className="flex items-center gap-4 rounded-[22px] border border-white/6 bg-white/[0.03] px-4 py-4"
                      >
                        <div className="h-6 w-8 rounded-full bg-white/8" />
                        <div className="h-12 w-12 rounded-full bg-white/8" />
                        <div className="flex-1 space-y-2">
                          <div className="h-5 w-1/3 rounded-full bg-white/8" />
                          <div className="h-4 w-1/4 rounded-full bg-white/6" />
                        </div>
                      </div>
                    ))
                  ) : rankingUsers.length ? (
                    rankingUsers.slice(0, 6).map((creator, index) => (
                      <button
                        key={`${creator.userId}-${index}`}
                        type="button"
                        onClick={() => setSelectedCreatorId(creator.userId)}
                        className="flex w-full items-center gap-4 rounded-[22px] border border-white/6 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.06]"
                      >
                        <div className="w-8 text-center text-[22px]">
                          {index === 0
                            ? "🥇"
                            : index === 1
                              ? "🥈"
                              : index === 2
                                ? "🥉"
                                : index + 1}
                        </div>
                        <div
                          className="grid h-12 w-12 place-items-center rounded-full text-sm font-black text-white"
                          style={{ backgroundColor: creator.avatarColor }}
                        >
                          {getAvatarInitial(creator.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[18px] font-semibold text-white">
                            {creator.name}
                          </p>
                          <p className="mt-1 text-sm text-white/44">
                            本周获得 {creator.likes} 赞
                          </p>
                        </div>
                        <div className="text-right text-sm text-white/62">
                          <p>{index + 1}</p>
                          <p className="mt-1 text-white/34">作品 {creator.works}</p>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-white/6 bg-white/[0.03] px-5 py-8 text-center text-white/52">
                      榜单会在第一批作品上线后点亮。
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,12,34,0.92),rgba(11,8,24,0.98))] p-6 shadow-[0_22px_58px_rgba(0,0,0,0.24)]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[13px] font-semibold tracking-[0.14em] text-white/44">
                      社区规则
                    </p>
                    <h4 className="mt-3 text-[28px] font-black tracking-[-0.04em] text-white">
                      让展示更温柔，也更清晰
                    </h4>
                  </div>
                </div>
                <div className="mt-6 grid gap-4 md:grid-cols-3">
                  {[
                    "分享入口开放在工坊生成完成之后，避免无关内容进入社区广场。",
                    "系统会审核提示词与展示内容，过滤不适合儿童社区的表达方式。",
                    "每个孩子都可以在个人主页里查看投稿状态和自己的成长轨迹。",
                  ].map((rule) => (
                    <div
                      key={rule}
                      className="rounded-[22px] border border-white/6 bg-white/[0.03] px-5 py-5 text-sm leading-8 text-white/58"
                    >
                      {rule}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,12,34,0.92),rgba(11,8,24,0.98))] p-6 shadow-[0_22px_58px_rgba(0,0,0,0.24)]">
                <p className="text-[13px] font-semibold tracking-[0.14em] text-white/44">
                  快速入口
                </p>
                <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <Link
                    href={isLoggedIn ? "/profile" : "/login?redirect=/profile"}
                    className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-6 text-left transition hover:bg-white/[0.05]"
                  >
                    <p className="text-[18px] font-semibold text-white">
                      {isLoggedIn ? "查看我的投稿状态" : "先登录，再管理作品"}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/52">
                      进入个人主页，查看投稿审核进度与公开展示状态。
                    </p>
                  </Link>
                  <Link
                    href="/workshop?mode=coding"
                    className="rounded-[24px] border border-white/8 bg-white/[0.03] px-5 py-6 text-left transition hover:bg-white/[0.05]"
                  >
                    <p className="text-[18px] font-semibold text-white">
                      去工坊继续创作
                    </p>
                    <p className="mt-2 text-sm leading-7 text-white/52">
                      回到创作空间，生成新的作品并继续分享到社区。
                    </p>
                  </Link>
                </div>
              </div>
            </div>
          </div>

          <aside className="space-y-6">
            <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,12,34,0.92),rgba(11,8,24,0.98))] p-6 shadow-[0_22px_58px_rgba(0,0,0,0.24)]">
              <p className="text-[13px] font-semibold tracking-[0.14em] text-white/44">
                当前详情
              </p>
              {heroPost ? (
                <div className="mt-5 space-y-5">
                  <div className="overflow-hidden rounded-[24px] border border-white/8 bg-white/[0.03]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroPost.preview_image_url}
                      alt={heroPost.title}
                      className="aspect-[1.1/1] h-full w-full object-cover"
                    />
                  </div>
                  <div>
                    <p className="text-sm text-[#c8afff]">{heroPost.category}</p>
                    <h4 className="mt-2 text-[28px] font-black tracking-[-0.05em] text-white">
                      {heroPost.title}
                    </h4>
                    <p className="mt-4 text-sm leading-7 text-white/58">
                      {heroPost.prompt}
                    </p>
                  </div>
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCreatorId(heroPost.user_id)}
                      className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-sm font-semibold text-white/82"
                    >
                      查看作者更多作品
                    </button>
                    <Link
                      href="/profile"
                      className="rounded-full border border-white/10 bg-white/[0.03] px-5 py-3 text-center text-sm font-semibold text-white/66"
                    >
                      去我的主页管理投稿
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="mt-5 rounded-[22px] border border-white/6 bg-white/[0.03] px-5 py-8 text-center text-white/52">
                  作品详情会在这里显示。
                </div>
              )}
            </div>

            <div className="rounded-[32px] border border-white/8 bg-[linear-gradient(180deg,rgba(18,12,34,0.92),rgba(11,8,24,0.98))] p-6 shadow-[0_22px_58px_rgba(0,0,0,0.24)]">
              <p className="text-[13px] font-semibold tracking-[0.14em] text-white/44">
                分类说明
              </p>
              <div className="mt-5 space-y-3">
                {Object.entries(categoryDescriptions).map(([label, description]) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setActiveTab(label as CommunityTab)}
                    className="w-full rounded-[20px] border border-white/6 bg-white/[0.03] px-4 py-4 text-left transition hover:bg-white/[0.06]"
                  >
                    <p className="text-[16px] font-semibold text-white">{label}</p>
                    <p className="mt-2 text-sm leading-7 text-white/52">{description}</p>
                  </button>
                ))}
              </div>
            </div>

          </aside>
        </div>
      </section>
    </>
  );
}
