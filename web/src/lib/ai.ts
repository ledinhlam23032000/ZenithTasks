// Tích hợp AI (Claude của Anthropic) để soạn tin nhắn chăm sóc khách hàng.
// Khoá API đọc từ biến môi trường ANTHROPIC_API_KEY — CHỈ chạy phía máy chủ.
// Chưa cấu hình khoá thì tính năng AI tự ẩn (aiConfigured() = false).

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

/** Đã cấu hình khoá AI chưa? Dùng để ẩn/hiện nút AI trên giao diện. */
export function aiConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Mô hình mặc định — dùng bản Claude mới nhất, chi phí thấp cho tin ngắn. */
const DEFAULT_MODEL = "claude-sonnet-4-6";

/** Gọi Claude API để sinh nội dung. Trả về văn bản hoặc lỗi thân thiện. */
export async function generateMessage(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<AiResult> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, error: "Chưa cấu hình AI (thiếu ANTHROPIC_API_KEY)." };
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: opts.maxTokens ?? 600,
        system: opts.system,
        messages: [{ role: "user", content: opts.prompt }],
      }),
    });

    if (!res.ok) {
      const t = await res.text().catch(() => "");
      if (res.status === 401) return { ok: false, error: "API key AI không hợp lệ." };
      return { ok: false, error: `Lỗi dịch vụ AI (${res.status}). ${t.slice(0, 120)}` };
    }

    const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = (data.content ?? [])
      .filter((b) => b.type === "text" && b.text)
      .map((b) => b.text as string)
      .join("\n")
      .trim();
    return text ? { ok: true, text } : { ok: false, error: "AI không trả về nội dung." };
  } catch {
    return { ok: false, error: "Không gọi được dịch vụ AI (kiểm tra mạng hoặc API key)." };
  }
}
