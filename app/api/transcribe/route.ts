import { NextResponse } from "next/server";

const SILICONFLOW_TRANSCRIBE_API_URL =
  "https://api.siliconflow.cn/v1/audio/transcriptions";

type SiliconFlowTranscribeResponse = {
  text?: string;
  error?: {
    message?: string;
  };
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "缺少有效的音频文件 file。" },
        { status: 400 },
      );
    }

    if (!process.env.SILICONFLOW_API_KEY) {
      return NextResponse.json(
        { error: "服务端缺少 SILICONFLOW_API_KEY 环境变量。" },
        { status: 500 },
      );
    }

    const upstreamFormData = new FormData();
    upstreamFormData.append("file", file, file.name || "audio.webm");
    upstreamFormData.append("model", "FunAudioLLM/SenseVoiceSmall");

    const upstreamResponse = await fetch(SILICONFLOW_TRANSCRIBE_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SILICONFLOW_API_KEY}`,
      },
      body: upstreamFormData,
    });

    if (!upstreamResponse.ok) {
      const errorData = await upstreamResponse.text();
      console.error("【SiliconFlow 语音转写接口报错详情】:", errorData);

      return NextResponse.json(
        {
          error: errorData || "语音识别接口请求失败，请稍后再试。",
        },
        { status: upstreamResponse.status },
      );
    }

    const data =
      (await upstreamResponse.json()) as SiliconFlowTranscribeResponse;
    const text = data.text?.trim();

    if (!text) {
      return NextResponse.json(
        { error: "语音模型没有返回可用的识别文本。" },
        { status: 502 },
      );
    }

    return NextResponse.json({ text });
  } catch {
    return NextResponse.json(
      { error: "语音识别接口暂时出了点小状况，请稍后再试。" },
      { status: 500 },
    );
  }
}
