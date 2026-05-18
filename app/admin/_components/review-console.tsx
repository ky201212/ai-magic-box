"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AdminCommunityPostRecord,
  CommunityReviewSettingRecord,
} from "./types";

type ReviewConsoleProps = {
  initialPosts: AdminCommunityPostRecord[];
  initialReviewSetting: CommunityReviewSettingRecord;
};

type ReviewFilter = "all" | "draft" | "pending" | "approved" | "rejected";
type ReviewSaveStatus = "idle" | "saving" | "success" | "error";
type OperationSaveStatus = ReviewSaveStatus;

function getStatusLabel(status: AdminCommunityPostRecord["moderation_status"]) {
  if (status === "draft") {
    return "已保存未发布";
  }

  if (status === "approved") {
    return "已发布";
  }

  if (status === "rejected") {
    return "已拒绝";
  }

  return "待审核";
}

function getStageLabel(stage: AdminCommunityPostRecord["moderation_stage"]) {
  if (stage === "ai") {
    return "AI 审核";
  }

  if (stage === "fallback") {
    return "备用流程";
  }

  if (stage === "manual") {
    return "人工处理";
  }

  return "规则审核";
}

function parseModerationDetail(post: AdminCommunityPostRecord) {
  const detail = post.moderation_detail ?? {};
  const rule = (detail.rule ?? {}) as {
    approved?: boolean;
    reason?: string | null;
    matchedKeyword?: string | null;
  };
  const ai = (detail.ai ?? {}) as {
    executed?: boolean;
    approved?: boolean | null;
    reason?: string | null;
    raw?: string | null;
    error?: string | null;
  };
  const policy = (detail.policy ?? {}) as {
    aiApprovalMode?: "auto_publish" | "manual_review";
    lockManualApproveAfterAiReject?: boolean;
  };

  return { rule, ai, policy };
}

function getUserLabel(post: AdminCommunityPostRecord) {
  return (
    post.user_nickname ||
    post.user_display_name ||
    post.user_phone ||
    "未命名用户"
  );
}

function buildOperationDraft(post: AdminCommunityPostRecord) {
  return {
    like_count: String(post.like_count ?? 0),
    view_count: String(post.view_count ?? 0),
    share_count: String(post.share_count ?? 0),
    manual_sort_order: String(post.manual_sort_order ?? 0),
    creator_score: String(post.creator_score ?? 0),
    manual_creator_rank:
      post.manual_creator_rank === null || post.manual_creator_rank === undefined
        ? ""
        : String(post.manual_creator_rank),
    category: post.category ?? "创意编程",
    title: post.title,
    prompt: post.prompt,
    is_featured: Boolean(post.is_featured),
    is_creator_star: Boolean(post.is_creator_star),
  };
}

export function ReviewConsole({
  initialPosts,
  initialReviewSetting,
}: ReviewConsoleProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [activeFilter, setActiveFilter] = useState<ReviewFilter>("all");
  const [searchKeyword, setSearchKeyword] = useState("");
  const [reviewReasonByPostId, setReviewReasonByPostId] = useState<
    Record<string, string>
  >(
    Object.fromEntries(
      initialPosts.map((post) => [post.id, post.moderation_reason ?? ""]),
    ),
  );
  const [reviewSetting, setReviewSetting] = useState(initialReviewSetting);
  const [settingSaveStatus, setSettingSaveStatus] =
    useState<ReviewSaveStatus>("idle");
  const [isRefreshingPosts, setIsRefreshingPosts] = useState(false);
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null);
  const [expandedPostIds, setExpandedPostIds] = useState<
    Record<string, boolean>
  >({});
  const [operationSaveStatusByPostId, setOperationSaveStatusByPostId] =
    useState<Record<string, OperationSaveStatus>>({});
  const [operationDrafts, setOperationDrafts] = useState<
    Record<
      string,
      {
        like_count: string;
        view_count: string;
        share_count: string;
        manual_sort_order: string;
        creator_score: string;
        manual_creator_rank: string;
        category: string;
        title: string;
        prompt: string;
        is_featured: boolean;
        is_creator_star: boolean;
      }
    >
  >(
    Object.fromEntries(
      initialPosts.map((post) => [post.id, buildOperationDraft(post)]),
    ),
  );

  useEffect(() => {
    let mounted = true;

    const loadPosts = async (showLoading = true) => {
      if (showLoading) {
        setIsRefreshingPosts(true);
      }

      try {
        const response = await fetch("/api/admin/community-posts", {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          posts?: AdminCommunityPostRecord[];
        };

        if (!response.ok || !mounted || !data.posts) {
          return;
        }

        const latestPosts = data.posts;

        setPosts(latestPosts);
        setReviewReasonByPostId((current) => ({
          ...Object.fromEntries(
            latestPosts.map((post) => [post.id, post.moderation_reason ?? ""]),
          ),
          ...current,
        }));
        setOperationDrafts((current) => ({
          ...Object.fromEntries(
            latestPosts.map((post) => [
              post.id,
              current[post.id] ?? buildOperationDraft(post),
            ]),
          ),
          ...current,
        }));
      } catch {
        window.console.error("后台社区审核列表刷新失败");
      } finally {
        if (mounted && showLoading) {
          setIsRefreshingPosts(false);
        }
      }
    };

    if (!initialPosts.length) {
      void loadPosts();
    }
    const timer = window.setInterval(() => {
      void loadPosts(false);
    }, 10000);

    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, [initialPosts.length]);

  const reviewStats = useMemo(
    () => ({
      all: posts.length,
      pending: posts.filter((post) => post.moderation_status === "pending").length,
      approved: posts.filter((post) => post.moderation_status === "approved").length,
      draft: posts.filter((post) => post.moderation_status === "draft").length,
      rejected: posts.filter((post) => post.moderation_status === "rejected").length,
    }),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    const normalizedSearch = searchKeyword.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesFilter =
        activeFilter === "all" || post.moderation_status === activeFilter;

      if (!matchesFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return [
        post.title,
        post.prompt,
        post.user_phone ?? "",
        post.user_nickname ?? "",
        post.user_display_name ?? "",
      ]
        .join("\n")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [activeFilter, posts, searchKeyword]);

  const handleReview = async (
    post: AdminCommunityPostRecord,
    moderationStatus: "approved" | "pending" | "rejected",
  ) => {
    const moderationReason =
      moderationStatus === "rejected"
        ? reviewReasonByPostId[post.id]?.trim() ||
          "管理员判定该内容暂不适合公开展示。"
        : moderationStatus === "pending"
          ? "作品已转回人工待审核队列。"
          : reviewReasonByPostId[post.id]?.trim() || null;

    const response = await fetch(`/api/admin/community-posts/${post.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        moderation_status: moderationStatus,
        moderation_reason: moderationReason,
      }),
    });

    const data = (await response.json()) as {
      post?: AdminCommunityPostRecord;
      error?: string;
    };

    if (!response.ok || !data.post) {
      window.alert(data.error ?? "审核操作失败，请稍后再试。");
      return;
    }

    setPosts((current) =>
      current.map((item) => (item.id === post.id ? data.post! : item)),
    );
    setReviewReasonByPostId((current) => ({
      ...current,
      [post.id]: data.post?.moderation_reason ?? moderationReason ?? "",
    }));
  };

  const handleSaveReviewSetting = async () => {
    setSettingSaveStatus("saving");

    const payload = [
      {
        setting_key: "community.review.policy",
        setting_group: "community",
        label: "社区审核策略",
        description: "控制规则审核、AI审核、人工复核之间的流转方式和提示词要求。",
        value: {
          aiApprovalMode: reviewSetting.aiApprovalMode,
          aiModerationInstruction: reviewSetting.aiModerationInstruction,
          blockedKeywords: reviewSetting.blockedKeywords,
          lockManualApproveAfterAiReject:
            reviewSetting.lockManualApproveAfterAiReject,
          dailyPostLimit: Math.max(0, Math.floor(reviewSetting.dailyPostLimit || 0)),
        },
      },
    ];

    try {
      const response = await fetch("/api/admin/site-settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: payload }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      setSettingSaveStatus("success");
    } catch {
      setSettingSaveStatus("error");
    } finally {
      window.setTimeout(() => {
        setSettingSaveStatus("idle");
      }, 2200);
    }
  };

  const updateOperationDraft = (
    postId: string,
    key:
      | "like_count"
      | "view_count"
      | "share_count"
      | "manual_sort_order"
      | "creator_score"
      | "manual_creator_rank"
      | "category"
      | "title"
      | "prompt"
      | "is_featured"
      | "is_creator_star",
    value: string | boolean,
  ) => {
    setOperationDrafts((current) => ({
      ...current,
      [postId]: {
        like_count: current[postId]?.like_count ?? "0",
        view_count: current[postId]?.view_count ?? "0",
        share_count: current[postId]?.share_count ?? "0",
        manual_sort_order: current[postId]?.manual_sort_order ?? "0",
        creator_score: current[postId]?.creator_score ?? "0",
        manual_creator_rank: current[postId]?.manual_creator_rank ?? "",
        category: current[postId]?.category ?? "创意编程",
        title: current[postId]?.title ?? "",
        prompt: current[postId]?.prompt ?? "",
        is_featured: current[postId]?.is_featured ?? false,
        is_creator_star: current[postId]?.is_creator_star ?? false,
        [key]: value,
      },
    }));
  };

  const handleSaveOperations = async (postId: string) => {
    const draft = operationDrafts[postId];

    if (!draft) {
      return;
    }

    setOperationSaveStatusByPostId((current) => ({
      ...current,
      [postId]: "saving",
    }));

    try {
      const response = await fetch(`/api/admin/community-posts/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: draft.title.trim(),
          prompt: draft.prompt.trim(),
          category: draft.category,
          like_count: Number(draft.like_count || 0),
          view_count: Number(draft.view_count || 0),
          share_count: Number(draft.share_count || 0),
          manual_sort_order: Number(draft.manual_sort_order || 0),
          creator_score: Number(draft.creator_score || 0),
          manual_creator_rank: draft.manual_creator_rank.trim()
            ? Number(draft.manual_creator_rank)
            : null,
          is_featured: draft.is_featured,
          is_creator_star: draft.is_creator_star,
        }),
      });

      const data = (await response.json()) as {
        post?: AdminCommunityPostRecord;
        error?: string;
      };

      if (!response.ok || !data.post) {
        throw new Error(data.error ?? "社区运营数据保存失败。");
      }

      setPosts((current) =>
        current.map((item) => (item.id === postId ? data.post! : item)),
      );
      setOperationDrafts((current) => ({
        ...current,
        [postId]: buildOperationDraft(data.post!),
      }));
      setOperationSaveStatusByPostId((current) => ({
        ...current,
        [postId]: "success",
      }));
    } catch (error) {
      setOperationSaveStatusByPostId((current) => ({
        ...current,
        [postId]: "error",
      }));
      window.alert(
        error instanceof Error ? error.message : "社区运营数据保存失败。",
      );
    } finally {
      window.setTimeout(() => {
        setOperationSaveStatusByPostId((current) => ({
          ...current,
          [postId]: "idle",
        }));
      }, 2200);
    }
  };

  const togglePostExpanded = (postId: string) => {
    setExpandedPostIds((current) => ({
      ...current,
      [postId]: !current[postId],
    }));
  };

  const handleDeletePost = async (post: AdminCommunityPostRecord) => {
    const confirmed = window.confirm(
      `确定要永久删除《${post.title}》吗？删除后数据库里的作品、点赞和互动记录都会一起清掉，而且无法找回。`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingPostId(post.id);

    try {
      const response = await fetch(`/api/admin/community-posts/${post.id}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok || !data.success) {
        throw new Error(data.error ?? "删除作品失败。");
      }

      setPosts((current) => current.filter((item) => item.id !== post.id));
      setReviewReasonByPostId((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
      setOperationDrafts((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
      setExpandedPostIds((current) => {
        const next = { ...current };
        delete next[post.id];
        return next;
      });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "删除作品失败。");
    } finally {
      setDeletingPostId((current) => (current === post.id ? null : current));
    }
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-lg font-black text-slate-800">审核看板</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              这里会完整展示规则审核、AI审核、人工复核、已发布、已拒绝和待处理的全部作品。
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
                {[
                  { key: "all", label: "全部作品" },
                  { key: "draft", label: "已保存" },
                  { key: "pending", label: "待处理" },
                  { key: "approved", label: "已发布" },
                  { key: "rejected", label: "已拒绝" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveFilter(item.key as ReviewFilter)}
                  className={`rounded-full px-4 py-2 text-sm font-black ${
                    activeFilter === item.key
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {item.label}
                  {item.key === "all"
                    ? ` ${reviewStats.all}`
                    : item.key === "draft"
                      ? ` ${reviewStats.draft}`
                    : item.key === "pending"
                      ? ` ${reviewStats.pending}`
                      : item.key === "approved"
                        ? ` ${reviewStats.approved}`
                        : ` ${reviewStats.rejected}`}
                </button>
              ))}
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div className="rounded-[22px] bg-slate-50 px-4 py-4">
                <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                  全部作品
                </p>
                <p className="mt-3 text-3xl font-black text-slate-900">
                  {reviewStats.all}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#eef3ff] px-4 py-4">
                <p className="text-xs font-bold tracking-[0.14em] text-[#5b6fd4]">
                  已保存
                </p>
                <p className="mt-3 text-3xl font-black text-[#5b6fd4]">
                  {reviewStats.draft}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#fff7ed] px-4 py-4">
                <p className="text-xs font-bold tracking-[0.14em] text-[#b86a12]">
                  待处理
                </p>
                <p className="mt-3 text-3xl font-black text-[#b86a12]">
                  {reviewStats.pending}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#ecfdf3] px-4 py-4">
                <p className="text-xs font-bold tracking-[0.14em] text-[#1c8b5f]">
                  已发布
                </p>
                <p className="mt-3 text-3xl font-black text-[#1c8b5f]">
                  {reviewStats.approved}
                </p>
              </div>
              <div className="rounded-[22px] bg-[#fff1f2] px-4 py-4">
                <p className="text-xs font-bold tracking-[0.14em] text-[#d4557c]">
                  已拒绝
                </p>
                <p className="mt-3 text-3xl font-black text-[#d4557c]">
                  {reviewStats.rejected}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[26px] bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-black text-slate-800">审核策略</p>
                <p className="mt-2 text-sm leading-7 text-slate-500">
                  在这里决定 AI 审核通过后是否可以直接发布，以及 AI 拒绝后的人工处理权限。
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveReviewSetting}
                className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white"
              >
                {settingSaveStatus === "saving"
                  ? "保存中"
                  : settingSaveStatus === "success"
                    ? "已保存"
                    : settingSaveStatus === "error"
                      ? "重试保存"
                      : "保存策略"}
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                  AI 审核通过后的流转方式
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setReviewSetting((current) => ({
                        ...current,
                        aiApprovalMode: "auto_publish",
                      }))
                    }
                    className={`rounded-full px-4 py-2 text-sm font-black ${
                      reviewSetting.aiApprovalMode === "auto_publish"
                        ? "bg-[#ecfdf3] text-[#1c8b5f]"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    AI 通过后直接发布
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setReviewSetting((current) => ({
                        ...current,
                        aiApprovalMode: "manual_review",
                      }))
                    }
                    className={`rounded-full px-4 py-2 text-sm font-black ${
                      reviewSetting.aiApprovalMode === "manual_review"
                        ? "bg-[#fff7ed] text-[#b86a12]"
                        : "bg-white text-slate-500"
                    }`}
                  >
                    AI 通过后转人工复核
                  </button>
                </div>
              </div>

              <label className="block">
                <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                  每位用户每天可发布次数
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    value={reviewSetting.dailyPostLimit}
                    onChange={(event) =>
                      setReviewSetting((current) => ({
                        ...current,
                        dailyPostLimit: Math.max(0, Number(event.target.value) || 0),
                      }))
                    }
                    className="h-11 w-32 rounded-[16px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                  />
                  <p className="text-sm leading-7 text-slate-500">
                    `0` 表示不限制。超过后作品会保存在个人主页，但不会继续进入社区审核。
                  </p>
                </div>
              </label>

              <label className="block">
                <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                  AI 审核要求
                </p>
                <textarea
                  value={reviewSetting.aiModerationInstruction}
                  onChange={(event) =>
                    setReviewSetting((current) => ({
                      ...current,
                      aiModerationInstruction: event.target.value,
                    }))
                  }
                  rows={4}
                  className="mt-3 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none"
                />
              </label>

              <label className="block">
                <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                  规则筛选关键词
                </p>
                <textarea
                  value={reviewSetting.blockedKeywords.join("，")}
                  onChange={(event) =>
                    setReviewSetting((current) => ({
                      ...current,
                      blockedKeywords: event.target.value
                        .split(/[，,\n]/)
                        .map((item) => item.trim())
                        .filter(Boolean),
                    }))
                  }
                  rows={3}
                  className="mt-3 w-full rounded-[20px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none"
                />
              </label>

              <label className="flex items-start gap-3 rounded-[20px] bg-white px-4 py-4">
                <input
                  type="checkbox"
                  checked={reviewSetting.lockManualApproveAfterAiReject}
                  onChange={(event) =>
                    setReviewSetting((current) => ({
                      ...current,
                      lockManualApproveAfterAiReject: event.target.checked,
                    }))
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300"
                />
                <span className="text-sm font-bold leading-7 text-slate-600">
                  如果 AI 已明确拒绝，则人工不能直接改成已发布
                </span>
              </label>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-white/80 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-base font-black text-slate-800">搜索与筛选</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              可以按状态筛选，也可以搜索发布者姓名、昵称、手机号或作品标题。
            </p>
          </div>
          <div className="flex w-full max-w-[620px] items-center justify-end gap-3">
            {isRefreshingPosts && (
              <span className="text-xs font-bold text-slate-400">
                正在刷新最新审核作品...
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setIsRefreshingPosts(true);
                void fetch("/api/admin/community-posts", {
                  cache: "no-store",
                })
                  .then(async (response) => {
                    const data = (await response.json()) as {
                      posts?: AdminCommunityPostRecord[];
                    };

                    if (!response.ok || !data.posts) {
                      throw new Error("刷新失败");
                    }

                    const latestPosts = data.posts;

                    setPosts(latestPosts);
                    setReviewReasonByPostId((current) => ({
                      ...Object.fromEntries(
                        latestPosts.map((post) => [post.id, post.moderation_reason ?? ""]),
                      ),
                      ...current,
                    }));
                    setOperationDrafts((current) => ({
                      ...Object.fromEntries(
                        latestPosts.map((post) => [
                          post.id,
                          current[post.id] ?? buildOperationDraft(post),
                        ]),
                      ),
                      ...current,
                    }));
                  })
                  .catch(() => {
                    window.alert("审核列表刷新失败，请稍后再试。");
                  })
                  .finally(() => {
                    setIsRefreshingPosts(false);
                  });
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600"
            >
              立即刷新
            </button>
            <input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="搜索姓名、昵称、手机号或标题"
              className="w-full max-w-md rounded-full border border-slate-200 bg-slate-50 px-5 py-3 text-sm text-slate-700 outline-none"
            />
          </div>
        </div>
      </section>

      <div className="space-y-5">
        {filteredPosts.map((post) => {
          const { rule, ai, policy } = parseModerationDetail(post);
          const lockedByAiReject =
            reviewSetting.lockManualApproveAfterAiReject && ai.approved === false;
          const isExpanded = Boolean(expandedPostIds[post.id]);
          const operationSaveStatus =
            operationSaveStatusByPostId[post.id] ?? "idle";

          return (
            <article
              key={post.id}
              className="rounded-[30px] border border-white/80 bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.05)] sm:p-5"
            >
              <div className="grid gap-4 lg:grid-cols-[112px_minmax(0,1fr)]">
                <div className="h-32 overflow-hidden rounded-[22px] bg-slate-50 lg:h-36">
                  <img
                    src={post.preview_image_url}
                    alt={post.title}
                    className="h-full w-full object-contain"
                  />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {getStatusLabel(post.moderation_status)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          {getStageLabel(post.moderation_stage)}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          AI 通过后：
                          {policy.aiApprovalMode === "auto_publish" ||
                          reviewSetting.aiApprovalMode === "auto_publish"
                            ? "直发"
                            : "转人工"}
                        </span>
                      </div>
                      <h3 className="mt-4 text-2xl font-black text-slate-900">
                        {post.title}
                      </h3>
                      <p className="mt-2 text-sm font-bold text-slate-600">
                        发布者：{getUserLabel(post)}
                        {post.user_phone ? ` / ${post.user_phone}` : ""}
                      </p>
                      <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                        {post.prompt}
                      </p>
                    </div>

                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={lockedByAiReject}
                        onClick={() => handleReview(post, "approved")}
                        className="rounded-full bg-[#ecfdf3] px-4 py-2 text-sm font-black text-[#1c8b5f] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        发布
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(post, "pending")}
                        className="rounded-full bg-[#fff7ed] px-4 py-2 text-sm font-black text-[#b86a12]"
                      >
                        转回待审
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(post, "rejected")}
                        className="rounded-full bg-[#fff1f2] px-4 py-2 text-sm font-black text-[#d4557c]"
                      >
                        拒绝
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeletePost(post)}
                        disabled={deletingPostId === post.id}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {deletingPostId === post.id ? "删除中" : "永久删除"}
                      </button>
                      <button
                        type="button"
                        onClick={() => togglePostExpanded(post.id)}
                        aria-expanded={isExpanded}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-700"
                      >
                        {isExpanded ? "收起详情" : "展开详情"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {isExpanded && (
                <div className="mt-5 space-y-5 border-t border-slate-100 pt-5 lg:ml-32">
                  {lockedByAiReject && (
                    <div className="rounded-[20px] bg-[#fff7ed] px-4 py-3 text-sm font-bold leading-7 text-[#b86a12]">
                      AI 已明确拒绝该作品，当前策略下人工不能直接改成已发布。请先查看拒绝原因并让用户修改后重新提交。
                    </div>
                  )}

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[22px] bg-slate-50 p-4">
                      <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                        规则审核结果
                      </p>
                      <p className="mt-3 text-sm font-black text-slate-800">
                        {rule.approved ? "规则审核通过" : "规则审核未通过"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        原因：{rule.reason || "没有命中规则风险"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        命中关键词：{rule.matchedKeyword || "无"}
                      </p>
                    </div>
                    <div className="rounded-[22px] bg-slate-50 p-4">
                      <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                        AI 审核结果
                      </p>
                      <p className="mt-3 text-sm font-black text-slate-800">
                        {ai.executed
                          ? ai.approved === true
                            ? "AI 审核通过"
                            : ai.approved === false
                              ? "AI 审核拒绝"
                              : "AI 审核未给出明确结论"
                          : "AI 审核未执行"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        拒绝/结论原因：{ai.reason || "暂无"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        执行异常：{ai.error || "无"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-slate-50 p-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                      当前审核备注
                    </p>
                    <textarea
                      value={reviewReasonByPostId[post.id] ?? ""}
                      onChange={(event) =>
                        setReviewReasonByPostId((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))
                      }
                      rows={3}
                      placeholder="写清楚人工审核意见、拒绝原因或复审说明"
                      className="mt-3 w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-700 outline-none"
                    />
                  </div>

                  <div className="rounded-[22px] bg-slate-50 p-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                      AI 审核原始结果
                    </p>
                    <div className="mt-3 rounded-[18px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-500">
                      {ai.raw || "没有原始返回内容。"}
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold tracking-[0.14em] text-slate-400">
                          社区运营数据
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-500">
                          这里可以直接调作品的点赞、浏览、分享、排序和创作者星标。
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleSaveOperations(post.id)}
                        disabled={operationSaveStatus === "saving"}
                        className="rounded-full bg-slate-900 px-4 py-2 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {operationSaveStatus === "saving"
                          ? "保存中..."
                          : operationSaveStatus === "success"
                            ? "已保存"
                            : "保存运营数据"}
                      </button>
                    </div>
                    {operationSaveStatus === "success" && (
                      <div className="mt-3 rounded-[16px] bg-[#ecfdf3] px-4 py-3 text-sm font-bold text-[#1c8b5f]">
                        运营数据已保存，社区页面刷新后会展示最新数据。
                      </div>
                    )}
                    {operationSaveStatus === "error" && (
                      <div className="mt-3 rounded-[16px] bg-[#fff1f2] px-4 py-3 text-sm font-bold text-[#d4557c]">
                        保存失败，请检查权限或稍后再试。
                      </div>
                    )}

                    <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                      {[
                        ["like_count", "点赞数"],
                        ["view_count", "浏览数"],
                        ["share_count", "分享数"],
                        ["manual_sort_order", "作品排序"],
                        ["creator_score", "创作者分值"],
                        ["manual_creator_rank", "创作者手动排名"],
                      ].map(([key, label]) => (
                        <label key={key} className="block">
                          <p className="text-xs font-bold tracking-[0.12em] text-slate-400">
                            {label}
                          </p>
                          <input
                            type="number"
                            min={0}
                            value={
                              operationDrafts[post.id]?.[
                                key as keyof (typeof operationDrafts)[string]
                              ] as string
                            }
                            onChange={(event) =>
                              updateOperationDraft(
                                post.id,
                                key as
                                  | "like_count"
                                  | "view_count"
                                  | "share_count"
                                  | "manual_sort_order"
                                  | "creator_score"
                                  | "manual_creator_rank",
                                event.target.value,
                              )
                            }
                            className="mt-2 h-11 w-full rounded-[16px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                          />
                        </label>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <p className="text-xs font-bold tracking-[0.12em] text-slate-400">
                          社区分类
                        </p>
                        <input
                          value={operationDrafts[post.id]?.category ?? "创意编程"}
                          onChange={(event) =>
                            updateOperationDraft(post.id, "category", event.target.value)
                          }
                          className="mt-2 h-11 w-full rounded-[16px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                        />
                      </label>

                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <input
                            type="checkbox"
                            checked={Boolean(operationDrafts[post.id]?.is_featured)}
                            onChange={(event) =>
                              updateOperationDraft(
                                post.id,
                                "is_featured",
                                event.target.checked,
                              )
                            }
                          />
                          <span className="text-sm font-bold text-slate-600">
                            设为推荐作品
                          </span>
                        </label>
                        <label className="flex items-center gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3">
                          <input
                            type="checkbox"
                            checked={Boolean(operationDrafts[post.id]?.is_creator_star)}
                            onChange={(event) =>
                              updateOperationDraft(
                                post.id,
                                "is_creator_star",
                                event.target.checked,
                              )
                            }
                          />
                          <span className="text-sm font-bold text-slate-600">
                            设为创作之星
                          </span>
                        </label>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 xl:grid-cols-2">
                      <label className="block">
                        <p className="text-xs font-bold tracking-[0.12em] text-slate-400">
                          作品标题
                        </p>
                        <input
                          value={operationDrafts[post.id]?.title ?? post.title}
                          onChange={(event) =>
                            updateOperationDraft(post.id, "title", event.target.value)
                          }
                          className="mt-2 h-11 w-full rounded-[16px] border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none"
                        />
                      </label>

                      <label className="block">
                        <p className="text-xs font-bold tracking-[0.12em] text-slate-400">
                          作品提示词
                        </p>
                        <textarea
                          value={operationDrafts[post.id]?.prompt ?? post.prompt}
                          onChange={(event) =>
                            updateOperationDraft(post.id, "prompt", event.target.value)
                          }
                          rows={4}
                          className="mt-2 w-full rounded-[16px] border border-slate-200 bg-white px-3 py-3 text-sm leading-7 text-slate-700 outline-none"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}

        {!filteredPosts.length && (
          <div className="rounded-[28px] border border-dashed border-slate-200 bg-white px-6 py-12 text-center text-sm font-bold text-slate-400">
            当前筛选条件下没有找到对应作品。
          </div>
        )}
      </div>
    </div>
  );
}
