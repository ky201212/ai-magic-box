"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CommunityPostDetail = {
  id: string;
  user_id: string;
  mode: "coding" | "writing" | "painting";
  title: string;
  description: string | null;
  prompt: string;
  preview_image_url: string;
  preview_code: string;
  like_count: number;
  view_count: number;
  share_count: number;
  category: string;
  created_at: string;
  is_featured: boolean;
  manual_sort_order: number;
  moderation_reason: string | null;
  viewer_has_liked: boolean;
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getAuthorName(post: CommunityPostDetail) {
  return (
    post.user_profiles?.display_name ||
    post.users?.nickname ||
    post.users?.phone ||
    "小创作者"
  );
}

function getModeContentLabel(mode: CommunityPostDetail["mode"]) {
  if (mode === "writing") {
    return "作品正文";
  }

  if (mode === "painting") {
    return "绘画说明";
  }

  return "作品代码";
}

function getModeContentDescription(mode: CommunityPostDetail["mode"]) {
  if (mode === "writing") {
    return "这里展示这篇作品生成出来的完整文字内容。";
  }

  if (mode === "painting") {
    return "这里展示这张画的创作说明和图片来源信息。";
  }

  return "这里可以直接查看这份小程序/H5作品生成出来的源代码。";
}

function getWorkshopHref(post: CommunityPostDetail) {
  return `/workshop?mode=${post.mode}&fromCommunity=${post.id}`;
}

function WritingShowcase({
  title,
  content,
  copyMessage,
  onCopy,
}: {
  title: string;
  content: string;
  copyMessage: string;
  onCopy: () => void;
}) {
  return (
    <div className="relative flex aspect-[1.42/1] min-h-[360px] overflow-hidden rounded-[34px] border border-white/80 bg-[linear-gradient(180deg,rgba(255,247,219,0.72),rgba(255,251,238,0.94))] shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.16),transparent_58%,rgba(251,191,36,0.08))]" />
      <div className="absolute left-8 top-8 hidden h-40 w-40 rounded-full border border-white/45 lg:block" />
      <div className="absolute bottom-8 right-8 hidden h-48 w-48 rounded-full border border-white/40 lg:block" />

      <div className="relative flex h-full min-h-0 w-full p-4 lg:p-5">
        <div className="flex h-full min-h-0 w-full rounded-[26px] bg-gradient-to-br from-[#fffdf4] via-[#fff9eb] to-[#fff1cf] p-4 shadow-[0_20px_50px_rgba(245,158,11,0.10)]">
          <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[22px] border border-[#f9e7b2] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,252,241,0.98))] px-5 py-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.88)] sm:px-8 sm:py-7">
            <div className="absolute inset-y-0 left-6 w-px bg-[#f6b8c6]/80" />
            <div className="absolute inset-x-0 top-0 h-12 bg-gradient-to-r from-[#fff2c8]/35 via-transparent to-[#ffe5ef]/35" />

            <div className="relative z-10 flex flex-wrap items-start justify-between gap-3 pl-4">
              <div className="min-w-0">
                <div className="inline-flex rounded-full bg-[#fff1c9] px-4 py-2 text-sm font-bold text-amber-700">
                  AI写作展示
                </div>
                <h3 className="mt-3 line-clamp-2 text-[24px] font-black leading-tight tracking-[-0.04em] text-[#17213f] sm:text-[32px]">
                  {title}
                </h3>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <button
                  type="button"
                  onClick={onCopy}
                  className="rounded-full border border-[#f3d78f] bg-white px-4 py-2 text-sm font-black text-amber-700 shadow-[0_10px_22px_rgba(217,119,6,0.08)] transition hover:border-[#eec96e]"
                >
                  复制正文
                </button>
                {copyMessage && (
                  <p className="rounded-full bg-white/82 px-3 py-1 text-xs font-bold text-[#8a7141]">
                    {copyMessage}
                  </p>
                )}
              </div>
            </div>

            <div className="relative z-10 mt-4 min-h-0 flex-1 overflow-y-auto pl-4 pr-2">
              <div className="whitespace-pre-wrap text-[16px] leading-9 text-slate-700 sm:text-[18px]">
                {content}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CommunityDetailClient({
  postId,
  isLoggedIn,
}: {
  postId: string;
  isLoggedIn: boolean;
}) {
  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");
  const [contentCopyMessage, setContentCopyMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadPost = async () => {
      try {
        const postResponse = await fetch(`/api/community/posts/${postId}`, {
          cache: "no-store",
        });

        const postPayload = (await postResponse.json()) as {
          post?: CommunityPostDetail;
          error?: string;
        };

        if (!postResponse.ok || !postPayload.post) {
          throw new Error(postPayload.error ?? "作品详情打开失败。");
        }

        if (!mounted) {
          return;
        }

        setPost(postPayload.post);
        setContentCopyMessage("");
      } catch (requestError) {
        if (mounted) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "作品详情打开失败。",
          );
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    void loadPost();

    return () => {
      mounted = false;
    };
  }, [postId]);

  const authorName = useMemo(() => (post ? getAuthorName(post) : "小创作者"), [post]);

  const handleLike = async () => {
    if (!post || isLiking) {
      return;
    }

    if (!isLoggedIn) {
      window.location.href = `/login?redirect=/community/${post.id}`;
      return;
    }

    setIsLiking(true);

    try {
      const response = await fetch(`/api/community/posts/${post.id}/like`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        liked?: boolean;
        likeCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "点赞失败。");
      }

      setPost((current) =>
        current
          ? {
              ...current,
              viewer_has_liked: Boolean(data.liked),
              like_count: data.likeCount ?? current.like_count,
            }
          : current,
      );
    } catch (requestError) {
      window.alert(
        requestError instanceof Error ? requestError.message : "点赞失败。",
      );
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    if (!post || isSharing) {
      return;
    }

    setIsSharing(true);
    setShareMessage("");

    try {
      const response = await fetch(`/api/community/posts/${post.id}/share`, {
        method: "POST",
      });
      const data = (await response.json()) as {
        shareCount?: number;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "分享失败。");
      }

      const shareUrl = `${window.location.origin}/community/${post.id}`;

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setShareMessage("分享链接已经复制好了，可以直接发给别人。");
      } else {
        setShareMessage(`链接已经准备好：${shareUrl}`);
      }

      setPost((current) =>
        current
          ? {
              ...current,
              share_count: data.shareCount ?? current.share_count,
            }
          : current,
      );
    } catch (requestError) {
      setShareMessage(
        requestError instanceof Error ? requestError.message : "分享失败。",
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleCopyWritingContent = async () => {
    if (!post?.preview_code.trim()) {
      return;
    }

    try {
      if (!navigator.clipboard?.writeText) {
        setContentCopyMessage("可直接选中文字复制");
        return;
      }

      await navigator.clipboard.writeText(post.preview_code);
      setContentCopyMessage("正文已复制");
    } catch {
      setContentCopyMessage("可直接选中文字复制");
    }
  };

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="rounded-[32px] border border-white/80 bg-white/82 px-8 py-16 text-center shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
          <p className="text-lg font-black text-[#17213f]">正在打开作品详情</p>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="py-16">
        <div className="rounded-[32px] border border-white/80 bg-white/82 px-8 py-16 text-center shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
          <p className="text-[28px] font-black text-[#17213f]">这份作品暂时打不开</p>
          <p className="mx-auto mt-4 max-w-[34ch] text-sm leading-8 text-[#687394]">
            {error || "可能作品还没有通过审核，或者链接已经失效了。"}
          </p>
          <Link
            href="/community"
            className="mt-8 inline-flex rounded-full bg-[#625cff] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4]"
          >
            返回成长社区
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1.15fr)_420px]">
      <div className="space-y-6">
        {post.mode === "writing" ? (
          <WritingShowcase
            title={post.title}
            content={post.preview_code}
            copyMessage={contentCopyMessage}
            onCopy={handleCopyWritingContent}
          />
        ) : (
          <div className="overflow-hidden rounded-[34px] border border-white/80 bg-white/82 shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl">
            <img
              src={post.preview_image_url}
              alt={post.title}
              className="aspect-[1.42/1] h-full w-full object-cover"
            />
          </div>
        )}

        <div className="rounded-[34px] border border-white/80 bg-white/82 p-7 shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-[#dfe7ff] bg-[#f8f9ff] px-3 py-1 text-xs font-semibold text-[#627ee6]">
                  {post.category}
                </span>
                {post.is_featured && (
                  <span className="rounded-full bg-[#625cff] px-3 py-1 text-xs font-semibold text-white">
                    社区推荐
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-[42px] font-black leading-[1.04] tracking-[-0.06em] text-[#17213f]">
                {post.title}
              </h2>
              <p className="mt-4 text-sm text-[#8a95b5]">
                @{authorName} · 发布于 {formatDate(post.created_at)}
              </p>
              {post.description && (
                <p className="mt-5 max-w-3xl text-[16px] leading-8 text-[#516089]">
                  {post.description}
                </p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] border border-[#edf1ff] bg-[#f8f9ff] px-4 py-4 text-center">
                <p className="text-xs text-[#8a95b5]">点赞</p>
                <p className="mt-2 text-2xl font-black text-[#17213f]">{post.like_count}</p>
              </div>
              <div className="rounded-[22px] border border-[#edf1ff] bg-[#f8f9ff] px-4 py-4 text-center">
                <p className="text-xs text-[#8a95b5]">浏览</p>
                <p className="mt-2 text-2xl font-black text-[#17213f]">{post.view_count}</p>
              </div>
              <div className="rounded-[22px] border border-[#edf1ff] bg-[#f8f9ff] px-4 py-4 text-center">
                <p className="text-xs text-[#8a95b5]">分享</p>
                <p className="mt-2 text-2xl font-black text-[#17213f]">{post.share_count}</p>
              </div>
            </div>
          </div>

          <div className="mt-7 grid gap-4 md:grid-cols-2">
            <button
              type="button"
              onClick={() => void handleLike()}
              disabled={isLiking}
              className={`rounded-[22px] px-5 py-4 text-left transition ${
                post.viewer_has_liked
                  ? "bg-[linear-gradient(135deg,#efeaff,#f8f9ff)] text-[#5f55db] shadow-[inset_0_0_0_1px_rgba(123,105,255,0.18)]"
                  : "border border-[#e3e8ff] bg-white text-[#3f4b6f] hover:border-[#cad2ff]"
              }`}
            >
              <p className="text-lg font-black">
                {post.viewer_has_liked ? "已经点过赞了" : "给这份作品点个赞"}
              </p>
              <p className="mt-2 text-sm leading-7 text-[#7480a2]">
                点赞会同步记录到社区榜单和后台数据里。
              </p>
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={isSharing}
              className="rounded-[22px] border border-[#e3e8ff] bg-white px-5 py-4 text-left text-[#3f4b6f] transition hover:border-[#cad2ff]"
            >
              <p className="text-lg font-black">复制分享链接</p>
              <p className="mt-2 text-sm leading-7 text-[#7480a2]">
                分享之后会留下真实的分享记录，不再只是一个摆设按钮。
              </p>
            </button>
          </div>

          {shareMessage && (
            <div className="mt-4 rounded-[18px] border border-[#dfe7ff] bg-[#f8f9ff] px-4 py-3 text-sm leading-7 text-[#637092]">
              {shareMessage}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-[34px] border border-white/80 bg-white/82 p-7 shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
            <p className="text-sm font-semibold tracking-[0.14em] text-[#8a95b5]">
              创作提示词
            </p>
            <p className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-[#3f4d75]">
              {post.prompt}
            </p>
          </section>

          <section className="rounded-[34px] border border-white/80 bg-white/82 p-7 shadow-[0_18px_54px_rgba(91,111,185,0.12)] backdrop-blur-2xl">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] text-[#8a95b5]">
                  {getModeContentLabel(post.mode)}
                </p>
                <p className="mt-2 text-sm leading-7 text-[#7480a2]">
                  {getModeContentDescription(post.mode)}
                </p>
              </div>
            </div>
            {post.mode === "writing" ? (
              <div className="mt-5 max-h-[480px] overflow-auto rounded-[24px] border border-[#f3df99] bg-[#fffdf4] p-5 text-[15px] leading-8 text-[#3f4d75]">
                <div className="mb-4 flex justify-end">
                  <button
                    type="button"
                    onClick={handleCopyWritingContent}
                    className="rounded-full bg-white px-4 py-2 text-xs font-black text-amber-700 shadow-[0_10px_20px_rgba(217,119,6,0.08)]"
                  >
                    复制正文
                  </button>
                </div>
                <div className="whitespace-pre-wrap">{post.preview_code}</div>
              </div>
            ) : (
              <pre className="mt-5 max-h-[480px] overflow-auto rounded-[24px] bg-[#0d0a18] p-5 text-xs leading-7 text-[#d7dcff]">
                <code>{post.preview_code}</code>
              </pre>
            )}
          </section>
        </div>
      </div>

      <aside className="space-y-6">
        <section className="rounded-[34px] border border-white/80 bg-white/82 p-6 shadow-[0_22px_70px_rgba(99,113,181,0.14)] backdrop-blur-2xl">
          <p className="text-sm font-semibold tracking-[0.14em] text-[#8a95b5]">
            这份作品可以做什么
          </p>
          <div className="mt-5 grid gap-3">
            <Link
              href={getWorkshopHref(post)}
              className="rounded-[22px] bg-[#625cff] px-5 py-4 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(98,92,255,0.22)] transition hover:bg-[#544cf4]"
            >
              回到工坊继续灵感延展
            </Link>
            <Link
              href="/community"
              className="rounded-[22px] border border-[#e3e8ff] bg-white px-5 py-4 text-sm font-semibold text-[#5d688b] transition hover:border-[#cad2ff]"
            >
              再去看看别人的作品
            </Link>
          </div>
        </section>
      </aside>
    </section>
  );
}
