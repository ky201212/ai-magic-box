"use client";

import { useMemo, useState } from "react";
import type { AdminCommunityPostRecord } from "./types";

type ReviewConsoleProps = {
  initialPosts: AdminCommunityPostRecord[];
};

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

  return { rule, ai };
}

export function ReviewConsole({ initialPosts }: ReviewConsoleProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [activeFilter, setActiveFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const reviewStats = useMemo(
    () => ({
      all: posts.length,
      pending: posts.filter((post) => post.moderation_status === "pending").length,
      approved: posts.filter((post) => post.moderation_status === "approved").length,
      rejected: posts.filter((post) => post.moderation_status === "rejected").length,
    }),
    [posts],
  );

  const filteredPosts = useMemo(() => {
    if (activeFilter === "all") {
      return posts;
    }

    return posts.filter((post) => post.moderation_status === activeFilter);
  }, [activeFilter, posts]);

  const handleReview = async (
    postId: string,
    moderationStatus: "approved" | "pending" | "rejected",
  ) => {
    const response = await fetch(`/api/admin/community-posts/${postId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        moderation_status: moderationStatus,
        moderation_reason:
          moderationStatus === "rejected"
            ? "管理员判定该内容暂不适合公开展示。"
            : null,
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
      current.map((post) => (post.id === postId ? data.post! : post)),
    );
  };

  return (
    <div className="space-y-5">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black text-slate-800">审核看板</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              这里会同时展示规则审核、智能审核和人工复核的信息，方便你快速判断。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "全部作品" },
              { key: "pending", label: "待处理" },
              { key: "approved", label: "已通过" },
              { key: "rejected", label: "已驳回" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() =>
                  setActiveFilter(item.key as "all" | "pending" | "approved" | "rejected")
                }
                className={`rounded-full px-4 py-2 text-sm font-black ${
                  activeFilter === item.key
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {item.label}
                {item.key === "all"
                  ? ` ${reviewStats.all}`
                  : item.key === "pending"
                    ? ` ${reviewStats.pending}`
                    : item.key === "approved"
                      ? ` ${reviewStats.approved}`
                      : ` ${reviewStats.rejected}`}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-4">
          <div className="rounded-[22px] bg-slate-50 px-4 py-4">
            <p className="text-xs font-bold tracking-[0.14em] text-slate-400">全部作品</p>
            <p className="mt-3 text-3xl font-black text-slate-900">{reviewStats.all}</p>
          </div>
          <div className="rounded-[22px] bg-[#fff7ed] px-4 py-4">
            <p className="text-xs font-bold tracking-[0.14em] text-[#b86a12]">待审核</p>
            <p className="mt-3 text-3xl font-black text-[#b86a12]">{reviewStats.pending}</p>
          </div>
          <div className="rounded-[22px] bg-[#ecfdf3] px-4 py-4">
            <p className="text-xs font-bold tracking-[0.14em] text-[#1c8b5f]">已发布</p>
            <p className="mt-3 text-3xl font-black text-[#1c8b5f]">{reviewStats.approved}</p>
          </div>
          <div className="rounded-[22px] bg-[#fff1f2] px-4 py-4">
            <p className="text-xs font-bold tracking-[0.14em] text-[#d4557c]">已驳回</p>
            <p className="mt-3 text-3xl font-black text-[#d4557c]">{reviewStats.rejected}</p>
          </div>
        </div>
      </section>

      <div className="space-y-5">
        {filteredPosts.map((post) => {
          const { rule, ai } = parseModerationDetail(post);

          return (
            <article
              key={post.id}
              className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
            >
              <div className="grid gap-6 xl:grid-cols-[220px_1fr]">
                <div className="overflow-hidden rounded-[24px] bg-slate-50">
                  <img
                    src={post.preview_image_url}
                    alt={post.title}
                    className="aspect-[4/5] h-full w-full object-cover"
                  />
                </div>

                <div className="space-y-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          当前状态：{post.moderation_status}
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                          阶段：{post.moderation_stage}
                        </span>
                      </div>
                      <h3 className="mt-4 text-2xl font-black text-slate-900">{post.title}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-500">{post.prompt}</p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleReview(post.id, "approved")}
                        className="rounded-full bg-[#ecfdf3] px-4 py-2 text-sm font-black text-[#1c8b5f]"
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(post.id, "pending")}
                        className="rounded-full bg-[#fff7ed] px-4 py-2 text-sm font-black text-[#b86a12]"
                      >
                        转回待审
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReview(post.id, "rejected")}
                        className="rounded-full bg-[#fff1f2] px-4 py-2 text-sm font-black text-[#d4557c]"
                      >
                        驳回
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-[22px] bg-slate-50 p-4">
                      <p className="text-xs font-bold tracking-[0.14em] text-slate-400">规则审核结果</p>
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
                      <p className="text-xs font-bold tracking-[0.14em] text-slate-400">智能审核结果</p>
                      <p className="mt-3 text-sm font-black text-slate-800">
                        {ai.executed
                          ? ai.approved === true
                            ? "智能审核通过"
                            : ai.approved === false
                              ? "智能审核未通过"
                              : "智能审核未给出明确结论"
                          : "智能审核未执行"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        结论原因：{ai.reason || "暂无"}
                      </p>
                      <p className="mt-2 text-sm leading-7 text-slate-500">
                        执行异常：{ai.error || "无"}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-slate-50 p-4">
                    <p className="text-xs font-bold tracking-[0.14em] text-slate-400">智能审核原始结果</p>
                    <div className="mt-3 rounded-[18px] border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-500">
                      {ai.raw || "没有原始返回内容。"}
                    </div>
                  </div>

                  <div className="rounded-[22px] bg-slate-50 p-4 text-sm leading-7 text-slate-500">
                    <span className="font-black text-slate-700">当前人工备注：</span>
                    {post.moderation_reason || "暂无人工备注"}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
