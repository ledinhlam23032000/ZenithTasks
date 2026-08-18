import { NextResponse } from "next/server";
import { requireCap } from "@/lib/auth";

export const dynamic = "force-dynamic";

const MAX_AUDIO_SIZE = 16 * 1024 * 1024;
const allowedAudioTypes = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "video/webm",
]);

function voiceConfig() {
  const apiKey = (process.env.VOICE_API_KEY ?? "").trim();
  const baseUrl = (process.env.VOICE_BASE_URL ?? "https://api.openai.com/v1").trim().replace(/\/+$/, "");
  const model = (process.env.VOICE_MODEL ?? "whisper-1").trim();
  if (apiKey) return { apiKey, baseUrl, model };

  // Chỉ dùng AI_API_KEY làm fallback khi base URL thực sự là OpenAI; DeepSeek
  // và các provider chat-compatible khác thường không có endpoint transcription.
  const genericKey = (process.env.AI_API_KEY ?? "").trim();
  const genericBase = (process.env.AI_BASE_URL ?? "").trim();
  if (genericKey && /api\.openai\.com/i.test(genericBase)) {
    return { apiKey: genericKey, baseUrl: genericBase.replace(/\/+$/, ""), model };
  }
  return null;
}

export async function POST(request: Request) {
  await requireCap("mod:tro-ly");
  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json({ ok: false, error: "Chưa nhận được file ghi âm." }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_SIZE) {
    return NextResponse.json({ ok: false, error: "Bản ghi quá lớn. Anh hãy nói ngắn hơn 2 phút rồi thử lại." }, { status: 413 });
  }
  if (audio.type && !allowedAudioTypes.has(audio.type)) {
    return NextResponse.json({ ok: false, error: "Định dạng âm thanh chưa được hỗ trợ. Hãy dùng Chrome và thử lại." }, { status: 415 });
  }

  const config = voiceConfig();
  if (!config) {
    return NextResponse.json({ ok: false, error: "Chưa cấu hình dịch vụ nhận dạng giọng nói. Cần đặt VOICE_API_KEY và VOICE_BASE_URL trên máy chủ." }, { status: 503 });
  }

  const payload = new FormData();
  payload.set("file", audio, audio.name || "assistant-voice.webm");
  payload.set("model", config.model);
  payload.set("language", "vi");
  payload.set("response_format", "json");
  payload.set("prompt", "Trợ lý quản trị nội bộ, tiếng Việt, tên nhân sự, mã hồ sơ, ngày tháng, số tiền và thao tác kiểm duyệt.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch(`${config.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { authorization: `Bearer ${config.apiKey}` },
      body: payload,
      signal: controller.signal,
    });
    const body = await response.json().catch(async () => ({ error: await response.text().catch(() => "") }));
    if (!response.ok) {
      const detail = typeof body?.error === "string" ? body.error : "Dịch vụ transcription trả về lỗi.";
      return NextResponse.json({ ok: false, error: `Không nhận diện được giọng nói. ${detail.slice(0, 180)}` }, { status: 502 });
    }
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    if (!text) return NextResponse.json({ ok: false, error: "Không nghe rõ nội dung. Anh nói gần micro hơn và thử lại." }, { status: 422 });
    return NextResponse.json({ ok: true, text: text.slice(0, 4_000) });
  } catch (error) {
    const message = error instanceof Error && error.name === "AbortError" ? "Nhận dạng giọng nói quá thời gian chờ." : "Không kết nối được dịch vụ nhận dạng giọng nói.";
    return NextResponse.json({ ok: false, error: message }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}
