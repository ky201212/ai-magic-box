"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type CommunityPostDetail = {
  id: string;
  user_id: string;
  title: string;
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

type CommunityActivityLog = {
  id: string;
  user_id: string | null;
  activity_type: "view" | "like" | "unlike" | "share" | "admin_adjust";
  delta_value: number;
  note: string | null;
  created_at: string;
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

function getActivityLabel(log: CommunityActivityLog) {
  if (log.note) {
    return log.note;
  }

  if (log.activity_type === "view") {
    return "有人打开看了这份作品";
  }

  if (log.activity_type === "share") {
    return "这份作品被分享了一次";
  }

  if (log.activity_type === "like") {
    return "收到了一个赞";
  }

  if (log.activity_type === "unlike") {
    return "有一个赞被取消了";
  }

  return "管理员更新了这份作品的数据";
}

export function CommunityDetailClient({
  postId,
  isLoggedIn,
}: {
  postId: string;
  isLoggedIn: boolean;
}) {
  const [post, setPost] = useState<CommunityPostDetail | null>(null);
  const [logs, setLogs] = useState<CommunityActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isLiking, setIsLiking] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadPost = async () => {
      try {
        const [postResponse, activityResponse] = await Promise.all([
          fetch(`/api/community/posts/${postId}`, { cache: "no-store" }),
          fetch(`/api/community/posts/${postId}/activity`, { cache: "no-store" }),
        ]);

        const postPayload = (await postResponse.json()) as {
          post?: CommunityPostDetail;
          error?: string;
        };
        const activityPayload = (await activityResponse.json()) as {
          logs?: CommunityActivityLog[];
        };

        if (!postResponse.ok || !postPayload.post) {
          throw new Error(postPayload.error ?? "作品详情打开失败。");
        }

        if (!mounted) {
          return;
        }

        setPost(postPayload.post);
        setLogs(activityPayload.logs ?? []);
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

  if (isLoading) {
    return (
      <section className="py-16">
        <div className="rounded-[32px] border border-white/10 bg-white/6 px-8 py-16 text-center">
          <p className="text-lg font-black text-white">正在打开作品详情</p>
        </div>
      </section>
    );
  }

  if (!post) {
    return (
      <section className="py-16">
        <div className="rounded-[32px] border border-white/10 bg-white/6 px-8 py-16 text-center">
          <p className="text-[28px] font-black text-white">这份作品暂时打不开</p>
          <p className="mx-auto mt-4 max-w-[34ch] text-sm leading-8 text-white/58">
            {error || "可能作品还没有通过审核，或者链接已经失效了。"}
          </p>
          <Link
            href="/community"
            className="mt-8 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#1e1338]"
          >
            返回成长社区
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="grid gap-8 py-12 xl:grid-cols-[minmax(0,1.15fr)_420px]">
      <div className="space-y-6">
        <div className="overflow-hidden rounded-[34px] border border-white/10 bg-white/6">
          <img
            src={post.preview_image_url}
            alt={post.title}
            className="aspect-[1.42/1] h-full w-full object-cover"
          />
        </div>

        <div className="rounded-[34px] border border-white/10 bg-white/6 p-7">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-semibold text-white/78">
                  {post.category}
                </span>
                {post.is_featured && (
                  <span className="rounded-full bg-[#8f5dff]/72 px-3 py-1 text-xs font-semibold text-white">
                    社区推荐
                  </span>
                )}
              </div>
              <h2 className="mt-4 text-[42px] font-black leading-[1.04] tracking-[-0.06em] text-white">
                {post.title}
              </h2>
              <p className="mt-4 text-sm text-white/48">
                @{authorName} · 发布于 {formatDate(post.created_at)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-[22px] bg-white/7 px-4 py-4 text-center">
                <p className="text-xs text-white/44">点赞</p>
                <p className="mt-2 text-2xl font-black text-white">{post.like_count}</p>
              </div>
              <div className="rounded-[22px] bg-white/7 px-4 py-4 text-center">
                <p className="text-xs text-white/44">浏览</p>
                <p className="mt-2 text-2xl font-black text-white">{post.view_count}</p>
              </div>
              <div className="rounded-[22px] bg-white/7 px-4 py-4 text-center">
                <p className="text-xs text-white/44">分享</p>
                <p className="mt-2 text-2xl font-black text-white">{post.share_count}</p>
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
                  ? "bg-[linear-gradient(135deg,rgba(143,93,255,0.42),rgba(255,255,255,0.08))] text-white"
                  : "border border-white/10 bg-white/6 text-white/82"
              }`}
            >
              <p className="text-lg font-black">
                {post.viewer_has_liked ? "已经点过赞了" : "给这份作品点个赞"}
              </p>
              <p className="mt-2 text-sm leading-7 text-white/56">
                点赞会同步记录到社区榜单和后台数据里。
              </p>
            </button>

            <button
              type="button"
              onClick={() => void handleShare()}
              disabled={isSharing}
              className="rounded-[22px] border border-white/10 bg-white/6 px-5 py-4 text-left text-white/82 transition"
            >
              <p className="text-lg font-black">复制分享链接</p>
              <p className="mt-2 text-sm leading-7 text-white/56">
                分享之后会留下真实的分享记录，不再只是一个摆设按钮。
              </p>
            </button>
          </div>

          {shareMessage && (
            <div className="mt-4 rounded-[18px] bg-white/6 px-4 py-3 text-sm leading-7 text-white/66">
              {shareMessage}
            </div>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-[34px] border border-white/10 bg-white/6 p-7">
            <p className="text-sm font-semibold tracking-[0.14em] text-white/42">
              创作提示词
            </p>
            <p className="mt-5 whitespace-pre-wrap text-[15px] leading-8 text-white/72">
              {post.prompt}
            </p>
          </section>

          <section className="rounded-[34px] border border-white/10 bg-white/6 p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-[0.14em] text-white/42">
                  作品代码
                </p>
                <p className="mt-2 text-sm leading-7 text-white/56">
                  这里可以直接查看这份小程序/H5作品生成出来的源代码。
                </p>
              </div>
            </div>
            <pre className="mt-5 max-h-[480px] overflow-auto rounded-[24px] bg-[#0d0a18] p-5 text-xs leading-7 text-[#d7dcff]">
              <code>{post.preview_code}</code>
            </pre>
          </section>
        </div>
      </div>

      <aside className="space-y-6">
        <section className="rounded-[34px] border border-white/10 bg-white/6 p-6">
          <p className="text-sm font-semibold tracking-[0.14em] text-white/42">
            这份作品可以做什么
          </p>
          <div className="mt-5 grid gap-3">
            <Link
              href={`/workshop?mode=coding&fromCommunity=${post.id}`}
              className="rounded-[22px] bg-white px-5 py-4 text-sm font-semibold text-[#1e1338]"
            >
              回到工坊继续灵感延展
            </Link>
            <Link
              href="/community"
              className="rounded-[22px] border border-white/10 bg-white/6 px-5 py-4 text-sm font-semibold text-white/82"
            >
              再去看看别人的作品
            </Link>
          </div>
        </section>

        <section className="rounded-[34px] border border-white/10 bg-white/6 p-6">
          <p className="text-sm font-semibold tracking-[0.14em] text-white/42">
            最近互动
          </p>
          <div className="mt-5 space-y-3">
            {logs.length ? (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-[22px] border border-white/8 bg-white/6 px-4 py-4"
                >
                  <p className="text-sm font-semibold text-white/82">
                    {getActivityLabel(log)}
                  </p>
                  <p className="mt-2 text-xs text-white/36">
                    {formatDate(log.created_at)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[22px] border border-dashed border-white/10 bg-white/6 px-4 py-10 text-center text-sm text-white/46">
                这份作品的互动记录会显示在这里。
              </div>
            )}
          </div>
        </section>
      </aside>
    </section>
  );
}
