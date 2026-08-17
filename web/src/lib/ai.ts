// ============================================================================
// TÍCH HỢP AI — TRUNG LẬP NHÀ CUNG CẤP (không khoá cứng vào một hãng nào).
//
// Dùng để soạn tin nhắn chăm sóc khách hàng (tiếng Việt, ngắn). Hỗ trợ 2 "khẩu vị"
// API phổ biến, đủ phủ gần như mọi mô hình giá rẻ trên thị trường:
//
//   1) Chuẩn OpenAI  (POST {base}/chat/completions, Authorization: Bearer)
//      → DeepSeek, Alibaba Qwen (DashScope compat), Google Gemini (compat),
//        OpenAI, Groq, Together, OpenRouter, và model tự host (Ollama/vLLM/LM Studio).
//   2) Chuẩn Anthropic (POST {base}/v1/messages, x-api-key) → Claude.
//
// Cấu hình bằng BIẾN MÔI TRƯỜNG (chỉ chạy phía máy chủ — khoá KHÔNG lộ ra trình duyệt):
//   AI_API_KEY   — khoá API của nhà cung cấp bạn chọn (BẮT BUỘC để bật AI).
//   AI_BASE_URL  — địa chỉ gốc, vd:
//                    DeepSeek : https://api.deepseek.com
//                    Qwen     : https://dashscope.aliyuncs.com/compatible-mode/v1
//                    Gemini   : https://generativelanguage.googleapis.com/v1beta/openai
//                    OpenAI   : https://api.openai.com/v1
//                    Claude   : https://api.anthropic.com
//   AI_MODEL     — tên model, vd: deepseek-chat | qwen-plus | gemini-2.0-flash
//                    | gpt-4o-mini | claude-haiku-4-5
//   AI_PROVIDER  — (tuỳ chọn) "openai" | "anthropic". Bỏ trống = tự suy ra từ AI_BASE_URL.
//
// TƯƠNG THÍCH NGƯỢC: nếu chưa đặt AI_* mà có ANTHROPIC_API_KEY (cách cũ) thì vẫn
// chạy với Claude như trước (ANTHROPIC_MODEL / ANTHROPIC_BASE_URL được tôn trọng).
//
// Chưa cấu hình khoá → tính năng AI tự ẩn (aiConfigured() = false).
// ============================================================================

export type AiResult = { ok: true; text: string } | { ok: false; error: string };

export type AiProvider = "openai" | "anthropic";

export type JsonSchema = Record<string, unknown>;

export type StructuredAiResult<T> = { ok: true; data: T } | { ok: false; error: string };

export type AiConfig = {
  provider: AiProvider;
  apiKey: string;
  baseUrl: string; // đã bỏ dấu "/" ở cuối
  model: string;
};

type EnvLike = Record<string, string | undefined>;

const DEFAULTS = {
  anthropicBase: "https://api.anthropic.com",
  anthropicModel: "claude-haiku-4-5", // bản Claude rẻ nhất, đủ tốt cho tin ngắn
  openaiBase: "https://api.openai.com/v1",
  openaiModel: "gpt-4o-mini",
};

const stripSlash = (s?: string) => (s ?? "").trim().replace(/\/+$/, "");

/**
 * Phân giải cấu hình AI từ biến môi trường — KHÔNG thiên vị nhà cung cấp.
 * Ưu tiên cấu hình chung AI_* (dùng được cho mọi hãng), giữ tương thích ngược
 * với ANTHROPIC_*. Trả về null nếu chưa cấu hình (thiếu khoá → AI tắt).
 * Hàm thuần (nhận env vào) để dễ kiểm thử.
 */
export function resolveAiConfig(env: EnvLike = process.env): AiConfig | null {
  // 1) Cấu hình chung (khuyến nghị) — đặt được bất kỳ nhà cung cấp nào.
  const genericKey = (env.AI_API_KEY ?? "").trim();
  if (genericKey) {
    const base = stripSlash(env.AI_BASE_URL);
    const explicit = (env.AI_PROVIDER ?? "").trim().toLowerCase();
    const provider: AiProvider =
      explicit === "anthropic"
        ? "anthropic"
        : explicit === "openai" || explicit === "openai-compatible"
          ? "openai"
          : base.includes("anthropic.com")
            ? "anthropic"
            : "openai"; // mặc định chuẩn OpenAI (phổ biến nhất cho model giá rẻ)
    return {
      provider,
      apiKey: genericKey,
      baseUrl: base || (provider === "anthropic" ? DEFAULTS.anthropicBase : DEFAULTS.openaiBase),
      model: (env.AI_MODEL ?? "").trim() || (provider === "anthropic" ? DEFAULTS.anthropicModel : DEFAULTS.openaiModel),
    };
  }

  // 2) Tương thích ngược: cách cũ chỉ có ANTHROPIC_API_KEY.
  const anthropicKey = (env.ANTHROPIC_API_KEY ?? "").trim();
  if (anthropicKey) {
    return {
      provider: "anthropic",
      apiKey: anthropicKey,
      baseUrl: stripSlash(env.ANTHROPIC_BASE_URL) || DEFAULTS.anthropicBase,
      model: (env.ANTHROPIC_MODEL ?? "").trim() || DEFAULTS.anthropicModel,
    };
  }

  return null;
}

/** Đã cấu hình khoá AI chưa? Dùng để ẩn/hiện nút AI trên giao diện. */
export function aiConfigured(): boolean {
  return resolveAiConfig() !== null;
}

/** Gọi AI để sinh nội dung. Trả về văn bản hoặc lỗi thân thiện (tiếng Việt). */
export async function generateStructured<T>(opts: {
  system: string;
  prompt: string;
  schemaName: string;
  schema: JsonSchema;
  maxTokens?: number;
}): Promise<StructuredAiResult<T>> {
  const cfg = resolveAiConfig();
  if (!cfg) return { ok: false, error: "Chưa cấu hình AI (đặt AI_API_KEY hoặc ANTHROPIC_API_KEY)." };
  const maxTokens = opts.maxTokens ?? 1200;
  try {
    if (cfg.provider === "openai") return await callOpenAiStructured<T>(cfg, opts, maxTokens);
    return await callAnthropicStructured<T>(cfg, opts, maxTokens);
  } catch {
    return { ok: false, error: "Không gọi được dịch vụ AI (kiểm tra mạng hoặc API key)." };
  }
}

export async function generateMessage(opts: {
  system: string;
  prompt: string;
  maxTokens?: number;
}): Promise<AiResult> {
  const cfg = resolveAiConfig();
  if (!cfg) return { ok: false, error: "Chưa cấu hình AI (đặt AI_API_KEY hoặc ANTHROPIC_API_KEY)." };
  const maxTokens = opts.maxTokens ?? 600;

  try {
    return cfg.provider === "anthropic"
      ? await callAnthropic(cfg, opts.system, opts.prompt, maxTokens)
      : await callOpenAi(cfg, opts.system, opts.prompt, maxTokens);
  } catch {
    return { ok: false, error: "Không gọi được dịch vụ AI (kiểm tra mạng hoặc API key)." };
  }
}

function aiError(status: number, body: string): AiResult {
  if (status === 401 || status === 403) return { ok: false, error: "API key AI không hợp lệ." };
  return { ok: false, error: `Lỗi dịch vụ AI (${status}). ${body.slice(0, 160)}` };
}

async function callOpenAiStructured<T>(cfg: AiConfig, opts: { system: string; prompt: string; schemaName: string; schema: JsonSchema }, maxTokens: number): Promise<StructuredAiResult<T>> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: opts.schemaName, strict: true, schema: opts.schema },
      },
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: res.status === 401 || res.status === 403 ? "API key AI không hợp lệ." : `Lỗi dịch vụ AI (${res.status}). ${body.slice(0, 160)}` };
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  try {
    return text ? { ok: true, data: JSON.parse(text) as T } : { ok: false, error: "AI không trả về kế hoạch hợp lệ." };
  } catch {
    return { ok: false, error: "AI trả về dữ liệu không đúng định dạng." };
  }
}

async function callAnthropicStructured<T>(cfg: AiConfig, opts: { system: string; prompt: string; schemaName: string; schema: JsonSchema }, maxTokens: number): Promise<StructuredAiResult<T>> {
  const schemaText = JSON.stringify(opts.schema);
  const res = await fetch(`${cfg.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      system: `${opts.system}\n\nReturn ONLY valid JSON matching this schema, with no markdown fences:\n${schemaText}`,
      messages: [{ role: "user", content: opts.prompt }],
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: res.status === 401 || res.status === 403 ? "API key AI không hợp lệ." : `Lỗi dịch vụ AI (${res.status}). ${body.slice(0, 160)}` };
  }
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? []).filter((b) => b.type === "text" && b.text).map((b) => b.text as string).join("\\n").trim();
  try {
    const clean = text.replace(/^```(?:json)?\\s*/i, "").replace(/\\s*```$/i, "").trim();
    return clean ? { ok: true, data: JSON.parse(clean) as T } : { ok: false, error: "AI không trả về kế hoạch hợp lệ." };
  } catch {
    return { ok: false, error: "AI trả về dữ liệu không đúng định dạng." };
  }
}

// ----- Chuẩn OpenAI (DeepSeek / Qwen / Gemini / OpenAI / Groq / tự host...) -----
async function callOpenAi(cfg: AiConfig, system: string, prompt: string, maxTokens: number): Promise<AiResult> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { authorization: `Bearer ${cfg.apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) return aiError(res.status, await res.text().catch(() => ""));
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = (data.choices?.[0]?.message?.content ?? "").trim();
  return text ? { ok: true, text } : { ok: false, error: "AI không trả về nội dung." };
}

// ----- Chuẩn Anthropic (Claude) -----
async function callAnthropic(cfg: AiConfig, system: string, prompt: string, maxTokens: number): Promise<AiResult> {
  const res = await fetch(`${cfg.baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "x-api-key": cfg.apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!res.ok) return aiError(res.status, await res.text().catch(() => ""));
  const data = (await res.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (data.content ?? [])
    .filter((b) => b.type === "text" && b.text)
    .map((b) => b.text as string)
    .join("\n")
    .trim();
  return text ? { ok: true, text } : { ok: false, error: "AI không trả về nội dung." };
}
