"use client";

import Image from "next/image";
import { useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import {
  getInfoPostExcerpt,
  getInfoCategoryTitle,
  infoCategories,
  type InfoCategoryKey,
  type InfoContentPost,
  type InfoContentStatus,
} from "@/lib/info-content";

type InfoContentConsoleProps = {
  initialPosts: InfoContentPost[];
};

type SaveStatus = "idle" | "saving" | "success" | "error";
type UploadState = {
  image: boolean;
  video: boolean;
};

function createEmptyPost(): InfoContentPost {
  const today = new Date().toISOString().slice(0, 10);

  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `info-${Date.now()}`,
    category: "science",
    title: "",
    subtitle: "",
    summary: "",
    body: "",
    coverUrl: "",
    videoUrl: "",
    status: "draft",
    sortOrder: 10,
    publishedAt: today,
    updatedAt: today,
  };
}

export function InfoContentConsole({
  initialPosts,
}: InfoContentConsoleProps) {
  const [posts, setPosts] = useState(initialPosts);
  const [draft, setDraft] = useState<InfoContentPost>(() => {
    const firstPost = initialPosts[0];
    return firstPost ? { ...firstPost } : createEmptyPost();
  });
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [uploading, setUploading] = useState<UploadState>({
    image: false,
    video: false,
  });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => a.sortOrder - b.sortOrder),
    [posts],
  );
  const publishedCount = posts.filter(
    (post) => post.status === "published",
  ).length;

  const updateDraft = <Key extends keyof InfoContentPost>(
    key: Key,
    value: InfoContentPost[Key],
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const persistPosts = async (
    nextPosts: InfoContentPost[],
    successMessage: string,
  ) => {
    setStatus("saving");

    try {
      const response = await fetch("/api/admin/info-content", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ posts: nextPosts }),
      });
      const data = (await response.json()) as {
        posts?: InfoContentPost[];
        error?: string;
      };

      if (!response.ok || !data.posts) {
        throw new Error(data.error ?? "资讯保存失败");
      }

      setPosts(data.posts);
      setStatus("success");
      setStatusMessage(successMessage);
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "资讯保存失败，请稍后再试。",
      );
    } finally {
      window.setTimeout(() => {
        setStatus("idle");
        setStatusMessage("");
      }, 2400);
    }
  };

  const uploadMedia = async (file: File, mediaType: keyof UploadState) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("mediaType", mediaType === "image" ? "image" : "video");

    setUploading((current) => ({ ...current, [mediaType]: true }));
    setStatus("idle");
    setStatusMessage("");

    try {
      const response = await fetch("/api/admin/upload-info-media", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as {
        url?: string;
        error?: string;
      };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "素材上传失败");
      }

      if (mediaType === "image") {
        updateDraft("coverUrl", data.url);
        setStatusMessage("图片上传完成。");
      } else {
        updateDraft("videoUrl", data.url);
        setStatusMessage("视频上传完成。");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setStatusMessage(
        error instanceof Error ? error.message : "素材上传失败，请稍后再试。",
      );
    } finally {
      setUploading((current) => ({ ...current, [mediaType]: false }));
      window.setTimeout(() => {
        setStatus("idle");
        setStatusMessage("");
      }, 2200);
    }
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>,
    mediaType: keyof UploadState,
  ) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    await uploadMedia(file, mediaType);
    event.target.value = "";
  };

  const handleSave = async (nextStatus: InfoContentStatus) => {
    if (!draft.title.trim() || !draft.body.trim()) {
      window.alert("标题和详细内容都需要填写。");
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const nextDraft: InfoContentPost = {
      ...draft,
      title: draft.title.trim(),
      subtitle: draft.subtitle.trim(),
      summary: getInfoPostExcerpt({
        summary: draft.summary.trim(),
        subtitle: draft.subtitle.trim(),
        body: draft.body.trim(),
      }),
      body: draft.body.trim(),
      coverUrl: draft.coverUrl.trim(),
      videoUrl: draft.videoUrl.trim(),
      status: nextStatus,
      updatedAt: today,
    };
    const exists = posts.some((post) => post.id === nextDraft.id);
    const nextPosts = exists
      ? posts.map((post) => (post.id === nextDraft.id ? nextDraft : post))
      : [nextDraft, ...posts];

    await persistPosts(
      nextPosts,
      nextStatus === "published" ? "已发布到科普资讯页。" : "草稿已保存。",
    );
    setDraft(nextDraft);
  };

  const handleDelete = async (postId: string) => {
    if (!window.confirm("确认删除这条资讯吗？")) {
      return;
    }

    const nextPosts = posts.filter((post) => post.id !== postId);
    await persistPosts(nextPosts, "资讯已删除。");

    if (draft.id === postId) {
      setDraft(nextPosts[0] ? { ...nextPosts[0] } : createEmptyPost());
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black text-slate-800">编辑资讯</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              选择栏目，填写标题、副标题和详细内容，再直接上传活动图片或视频，保存后会同步到前台详情页。
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDraft(createEmptyPost())}
            className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700"
          >
            新建
          </button>
        </div>

        <div className="mt-6 space-y-4">
          <label className="block text-sm font-bold text-slate-600">
            栏目
            <select
              value={draft.category}
              onChange={(event) =>
                updateDraft("category", event.target.value as InfoCategoryKey)
              }
              className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
            >
              {infoCategories.map((category) => (
                <option key={category.key} value={category.key}>
                  {category.title}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm font-bold text-slate-600">
            标题
            <input
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
              className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              placeholder="例如：小红车校园科普体验日开放报名"
            />
          </label>

          <label className="block text-sm font-bold text-slate-600">
            副标题
            <textarea
              value={draft.subtitle}
              onChange={(event) => updateDraft("subtitle", event.target.value)}
              className="mt-2 h-24 w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none"
              placeholder="例如：活动亮点、适合对象、看点说明，或者活动副标题。"
            />
          </label>

          <label className="block text-sm font-bold text-slate-600">
            卡片摘要
            <textarea
              value={draft.summary}
              onChange={(event) => updateDraft("summary", event.target.value)}
              className="mt-2 h-24 w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none"
              placeholder="首页卡片上的简短介绍。不填也可以，系统会自动从副标题或正文里提炼。"
            />
          </label>

          <label className="block text-sm font-bold text-slate-600">
            详细内容
            <textarea
              value={draft.body}
              onChange={(event) => updateDraft("body", event.target.value)}
              className="mt-2 h-52 w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none"
              placeholder="在这里写完整内容，比如活动标题、活动副标题、活动详情、参与方式、获奖说明，或者视频配套讲解。"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-bold text-slate-600">
              发布日期
              <input
                type="date"
                value={draft.publishedAt}
                onChange={(event) =>
                  updateDraft("publishedAt", event.target.value)
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
            <label className="block text-sm font-bold text-slate-600">
              排序
              <input
                type="number"
                value={draft.sortOrder}
                onChange={(event) =>
                  updateDraft("sortOrder", Number(event.target.value))
                }
                className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
              />
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-600">活动/文章图片</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                直接上传封面或活动照片，点击后会打开资源管理器选择文件。
              </p>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void handleFileChange(event, "image")}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700"
                >
                  {uploading.image ? "图片上传中" : "上传图片"}
                </button>
                {draft.coverUrl ? (
                  <button
                    type="button"
                    onClick={() => updateDraft("coverUrl", "")}
                    className="rounded-full bg-white px-4 py-2 text-sm font-black text-rose-600"
                  >
                    删除图片
                  </button>
                ) : null}
              </div>
              {draft.coverUrl ? (
                <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-white">
                  <Image
                    src={draft.coverUrl}
                    alt={draft.title || "资讯图片预览"}
                    width={640}
                    height={320}
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-400">
                  还没有上传图片
                </div>
              )}
            </div>

            <div className="rounded-[22px] border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-bold text-slate-600">活动/视频素材</p>
              <p className="mt-2 text-sm leading-7 text-slate-500">
                可以直接上传活动视频或科普视频，不需要再填写外部链接。
              </p>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(event) => void handleFileChange(event, "video")}
              />
              <div className="mt-4 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => videoInputRef.current?.click()}
                  className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700"
                >
                  {uploading.video ? "视频上传中" : "上传视频"}
                </button>
                {draft.videoUrl ? (
                  <button
                    type="button"
                    onClick={() => updateDraft("videoUrl", "")}
                    className="rounded-full bg-white px-4 py-2 text-sm font-black text-rose-600"
                  >
                    删除视频
                  </button>
                ) : null}
              </div>
              {draft.videoUrl ? (
                <div className="mt-4 overflow-hidden rounded-[18px] border border-slate-200 bg-black">
                  <video
                    src={draft.videoUrl}
                    controls
                    className="h-40 w-full object-cover"
                  />
                </div>
              ) : (
                <div className="mt-4 rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-400">
                  还没有上传视频
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleSave("published")}
              className="rounded-full bg-slate-900 px-5 py-3 text-sm font-black text-white"
            >
              {status === "saving" ? "保存中" : "保存并发布"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("draft")}
              className="rounded-full bg-slate-100 px-5 py-3 text-sm font-black text-slate-700"
            >
              保存草稿
            </button>
          </div>

          {statusMessage && (
            <div
              className={`rounded-[18px] px-4 py-3 text-sm font-bold ${
                status === "error"
                  ? "bg-[#fff1f2] text-[#d4557c]"
                  : "bg-[#ecfdf3] text-[#1c8b5f]"
              }`}
            >
              {statusMessage}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-lg font-black text-slate-800">资讯列表</p>
            <p className="mt-2 text-sm leading-7 text-slate-500">
              共 {posts.length} 条，已发布 {publishedCount} 条。
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          {sortedPosts.length ? (
            sortedPosts.map((post) => (
              <article
                key={post.id}
                className={`rounded-[24px] border p-4 ${
                  draft.id === post.id
                    ? "border-sky-200 bg-sky-50"
                    : "border-slate-100 bg-slate-50"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-sky-700">
                        {getInfoCategoryTitle(post.category)}
                      </span>
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500">
                        {post.status === "published" ? "已发布" : "草稿"}
                      </span>
                      <span className="text-xs font-bold text-slate-400">
                        {post.publishedAt}
                      </span>
                    </div>
                    <p className="mt-3 text-base font-black text-slate-800">
                      {post.title}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm leading-7 text-slate-500">
                      {post.subtitle || post.summary}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft({ ...post })}
                      className="rounded-full bg-white px-4 py-2 text-sm font-black text-slate-700"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(post.id)}
                      className="rounded-full bg-white px-4 py-2 text-sm font-black text-rose-600"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-[22px] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-400">
              还没有资讯内容。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
