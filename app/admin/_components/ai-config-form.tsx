"use client";

import { useState } from "react";
import type { AiModeConfigRecord } from "./types";

type SaveStatus = "idle" | "saving" | "success" | "error";

type AiConfigFormProps = {
  initialConfigs: AiModeConfigRecord[];
};

type EditableAiConfig = AiModeConfigRecord & {
  extra_payload: Record<string, unknown>;
};

function normalizeConfigs(configs: AiModeConfigRecord[]): EditableAiConfig[] {
  return configs.map((config) => ({
    ...config,
    extra_payload: config.extra_payload ?? {},
  }));
}

export function AiConfigForm({ initialConfigs }: AiConfigFormProps) {
  const [configs, setConfigs] = useState<EditableAiConfig[]>(
    normalizeConfigs(initialConfigs),
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");

  const handleFieldChange = (
    modeKey: string,
    field: keyof AiModeConfigRecord,
    value: string | boolean,
  ) => {
    setConfigs((current) =>
      current.map((config) =>
        config.mode_key === modeKey ? { ...config, [field]: value } : config,
      ),
    );
  };

  const handleExtraPayloadChange = (
    modeKey: string,
    field: string,
    value: string | boolean | number,
  ) => {
    setConfigs((current) =>
      current.map((config) =>
        config.mode_key === modeKey
          ? {
              ...config,
              extra_payload: {
                ...config.extra_payload,
                [field]: value,
              },
            }
          : config,
      ),
    );
  };

  const handleSave = async () => {
    setSaveStatus("saving");

    try {
      const response = await fetch("/api/admin/ai-configs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          configs: configs.map((config) => ({
            ...config,
            extra_payload: config.extra_payload ?? {},
          })),
        }),
      });

      if (!response.ok) {
        throw new Error("保存失败");
      }

      setSaveStatus("success");
    } catch {
      setSaveStatus("error");
    } finally {
      window.setTimeout(() => {
        setSaveStatus("idle");
      }, 2200);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-12 items-center justify-center rounded-full bg-slate-900 px-6 text-sm font-black text-white shadow-[0_14px_30px_rgba(15,23,42,0.16)]"
        >
          {saveStatus === "saving"
            ? "保存中"
            : saveStatus === "success"
              ? "保存成功"
              : saveStatus === "error"
                ? "保存失败"
                : "保存 AI 配置"}
        </button>
      </div>

      <div className="space-y-5">
        {configs.map((config) => {
          const creditEnabled = config.extra_payload.creditEnabled === true;
          const creditCost = Number(config.extra_payload.creditCost ?? 0);
          const imageSize =
            typeof config.extra_payload.image_size === "string"
              ? config.extra_payload.image_size
              : "";

          return (
            <article
              key={config.mode_key}
              className="rounded-[30px] border border-white/80 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]"
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xl font-black text-slate-800">{config.mode_name}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    这里可以控制这个功能的启用状态、模型地址、系统提示词和扣币策略。
                  </p>
                </div>
                <label className="inline-flex items-center gap-3 rounded-full bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={config.is_enabled}
                    onChange={(event) =>
                      handleFieldChange(
                        config.mode_key,
                        "is_enabled",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />
                  启用这个功能
                </label>
              </div>

              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <label className="block text-sm font-bold text-slate-600">
                  功能名称
                  <input
                    value={config.mode_name}
                    onChange={(event) =>
                      handleFieldChange(config.mode_key, "mode_name", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  服务提供方
                  <input
                    value={config.provider}
                    onChange={(event) =>
                      handleFieldChange(config.mode_key, "provider", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  接口地址
                  <input
                    value={config.endpoint_url}
                    onChange={(event) =>
                      handleFieldChange(
                        config.mode_key,
                        "endpoint_url",
                        event.target.value,
                      )
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  模型名称
                  <input
                    value={config.model}
                    onChange={(event) =>
                      handleFieldChange(config.mode_key, "model", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                  />
                </label>
                <label className="block text-sm font-bold text-slate-600">
                  密钥环境变量名
                  <input
                    value={config.api_key_env}
                    onChange={(event) =>
                      handleFieldChange(config.mode_key, "api_key_env", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                  />
                </label>

                {config.mode_key === "painting" ? (
                  <label className="block text-sm font-bold text-slate-600">
                    生成图片尺寸
                    <input
                      value={imageSize}
                      onChange={(event) =>
                        handleExtraPayloadChange(
                          config.mode_key,
                          "image_size",
                          event.target.value,
                        )
                      }
                      className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                    />
                  </label>
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm leading-7 text-slate-500">
                    这个功能没有额外的图片尺寸配置项。
                  </div>
                )}
              </div>

              <div className="mt-5 grid gap-4 xl:grid-cols-[1fr_220px_220px]">
                <label className="flex items-center gap-3 rounded-[22px] bg-slate-50 px-4 py-4 text-sm font-bold text-slate-600">
                  <input
                    type="checkbox"
                    checked={creditEnabled}
                    onChange={(event) =>
                      handleExtraPayloadChange(
                        config.mode_key,
                        "creditEnabled",
                        event.target.checked,
                      )
                    }
                    className="h-4 w-4"
                  />
                  勾选后使用这个功能要扣魔法币
                </label>

                <label className="block text-sm font-bold text-slate-600">
                  每次扣多少币
                  <input
                    type="number"
                    min={0}
                    value={creditCost}
                    onChange={(event) =>
                      handleExtraPayloadChange(
                        config.mode_key,
                        "creditCost",
                        Number(event.target.value),
                      )
                    }
                    className="mt-2 h-12 w-full rounded-[18px] border border-slate-200 bg-slate-50 px-4 text-slate-800 outline-none"
                  />
                </label>

                <div className="rounded-[18px] bg-[#fff7ed] px-4 py-4 text-sm leading-7 text-[#b86a12]">
                  {creditEnabled
                    ? `当前已开启扣币，每次消耗 ${creditCost} 个魔法币。`
                    : "当前未开启扣币，用户可以免费使用这个功能。"}
                </div>
              </div>

              <label className="mt-5 block text-sm font-bold text-slate-600">
                系统提示词
                <textarea
                  value={config.system_prompt}
                  onChange={(event) =>
                    handleFieldChange(
                      config.mode_key,
                      "system_prompt",
                      event.target.value,
                    )
                  }
                  className="mt-2 h-44 w-full rounded-[18px] border border-slate-200 bg-slate-50 p-4 text-slate-800 outline-none"
                />
              </label>
            </article>
          );
        })}
      </div>
    </div>
  );
}
