import { afterEach, describe, it, expect, vi } from "vitest";
import { generateStructured, resolveAiConfig } from "../ai";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("resolveAiConfig — trung lập nhà cung cấp", () => {
  it("chưa cấu hình khoá → null (AI tắt)", () => {
    expect(resolveAiConfig({})).toBeNull();
  });

  it("AI_API_KEY + base lạ → suy ra chuẩn OpenAI (DeepSeek)", () => {
    const c = resolveAiConfig({
      AI_API_KEY: "sk-deepseek",
      AI_BASE_URL: "https://api.deepseek.com",
      AI_MODEL: "deepseek-chat",
    });
    expect(c).toEqual({
      provider: "openai",
      apiKey: "sk-deepseek",
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-chat",
    });
  });

  it("Qwen (DashScope) — bỏ dấu / cuối base, giữ nguyên model", () => {
    const c = resolveAiConfig({
      AI_API_KEY: "sk-qwen",
      AI_BASE_URL: "https://dashscope.aliyuncs.com/compatible-mode/v1/",
      AI_MODEL: "qwen-plus",
    });
    expect(c?.provider).toBe("openai");
    expect(c?.baseUrl).toBe("https://dashscope.aliyuncs.com/compatible-mode/v1");
    expect(c?.model).toBe("qwen-plus");
  });

  it("AI_BASE_URL chứa anthropic.com → tự nhận là Anthropic", () => {
    const c = resolveAiConfig({ AI_API_KEY: "k", AI_BASE_URL: "https://api.anthropic.com", AI_MODEL: "claude-haiku-4-5" });
    expect(c?.provider).toBe("anthropic");
  });

  it("AI_PROVIDER ép kiểu thắng cả suy luận từ base", () => {
    const c = resolveAiConfig({ AI_API_KEY: "k", AI_PROVIDER: "anthropic", AI_BASE_URL: "https://proxy.local" });
    expect(c?.provider).toBe("anthropic");
    expect(c?.baseUrl).toBe("https://proxy.local");
  });

  it("chỉ có AI_API_KEY → mặc định chuẩn OpenAI + model/base mặc định", () => {
    const c = resolveAiConfig({ AI_API_KEY: "k" });
    expect(c).toEqual({ provider: "openai", apiKey: "k", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" });
  });

  it("tương thích ngược: ANTHROPIC_API_KEY → Claude, model mặc định haiku rẻ", () => {
    const c = resolveAiConfig({ ANTHROPIC_API_KEY: "ant" });
    expect(c).toEqual({
      provider: "anthropic",
      apiKey: "ant",
      baseUrl: "https://api.anthropic.com",
      model: "claude-haiku-4-5",
    });
  });

  it("ANTHROPIC_MODEL ghi đè model mặc định", () => {
    const c = resolveAiConfig({ ANTHROPIC_API_KEY: "ant", ANTHROPIC_MODEL: "claude-sonnet-4-6" });
    expect(c?.model).toBe("claude-sonnet-4-6");
  });

  it("AI_* ưu tiên hơn ANTHROPIC_* khi cả hai cùng có", () => {
    const c = resolveAiConfig({ AI_API_KEY: "new", AI_BASE_URL: "https://api.deepseek.com", ANTHROPIC_API_KEY: "old" });
    expect(c?.apiKey).toBe("new");
    expect(c?.provider).toBe("openai");
  });
});


describe("generateStructured — tương thích provider", () => {
  it("dùng AI_AGENT_MODEL cho planner nhưng vẫn giữ provider/base chung", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_BASE_URL", "https://provider.test/v1");
    vi.stubEnv("AI_MODEL", "deepseek-chat");
    vi.stubEnv("AI_AGENT_MODEL", "deepseek-reasoner");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"action":"none"}' } }] }), { status: 200 }));

    await generateStructured<{ action: string }>({
      system: "Return JSON",
      prompt: "test",
      schemaName: "test_plan",
      schema: { type: "object", properties: { action: { type: "string" } }, required: ["action"], additionalProperties: false },
    });

    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain('"model":"deepseek-reasoner"');
  });

  it("DeepSeek dùng json_object thay vì json_schema", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_BASE_URL", "https://api.deepseek.com");
    vi.stubEnv("AI_MODEL", "deepseek-chat");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"action":"none"}' } }] }), { status: 200 }));

    const result = await generateStructured<{ action: string }>({
      system: "Return JSON",
      prompt: "test",
      schemaName: "test_plan",
      schema: { type: "object", properties: { action: { type: "string" } }, required: ["action"], additionalProperties: false },
    });

    expect(result).toEqual({ ok: true, data: { action: "none" } });
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).toContain('"type":"json_object"');
    expect(String(fetchSpy.mock.calls[0]?.[1]?.body)).not.toContain('"json_schema"');
  });

  it("DeepSeek reasoner rỗng content thì fallback sang AI_MODEL chat", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_BASE_URL", "https://api.deepseek.com");
    vi.stubEnv("AI_MODEL", "deepseek-chat");
    vi.stubEnv("AI_AGENT_MODEL", "deepseek-reasoner");
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "", reasoning_content: "đã suy luận" } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"action":"none"}' } }] }), { status: 200 }));

    const result = await generateStructured<{ action: string }>({
      system: "Return JSON",
      prompt: "test",
      schemaName: "test_plan",
      schema: { type: "object", properties: { action: { type: "string" } }, required: ["action"], additionalProperties: false },
    });

    expect(result).toEqual({ ok: true, data: { action: "none" } });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1]?.[1]?.body)).toContain('"model":"deepseek-chat"');
  });

  it("fallback sang JSON trong prompt khi response_format bị provider từ chối", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_BASE_URL", "https://provider.test/v1");
    vi.stubEnv("AI_MODEL", "test-model");
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: "This response_format type is unavailable now", code: "invalid_request_error" } }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '```json\n{"action":"none"}\n```' } }] }), { status: 200 }));

    const result = await generateStructured<{ action: string }>({
      system: "Return JSON",
      prompt: "test",
      schemaName: "test_plan",
      schema: { type: "object", properties: { action: { type: "string" } }, required: ["action"], additionalProperties: false },
    });

    expect(result).toEqual({ ok: true, data: { action: "none" } });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(String(fetchSpy.mock.calls[1]?.[1]?.body)).not.toContain("response_format");
  });

  it("retry một lần khi provider trả 429 rồi mới thành công", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_BASE_URL", "https://provider.test/v1");
    vi.stubEnv("AI_MODEL", "test-model");
    vi.stubEnv("AI_MAX_RETRIES", "1");
    vi.spyOn(Math, "random").mockReturnValue(0);
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response("rate limited", { status: 429 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: '{"action":"none"}' } }] }), { status: 200 }));

    const result = await generateStructured<{ action: string }>({
      system: "Return JSON",
      prompt: "test",
      schemaName: "test_plan",
      schema: { type: "object", properties: { action: { type: "string" } }, required: ["action"], additionalProperties: false },
    });

    expect(result).toEqual({ ok: true, data: { action: "none" } });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("trả lỗi ổn định khi model trả content rỗng hoặc JSON hỏng", async () => {
    vi.stubEnv("AI_API_KEY", "test-key");
    vi.stubEnv("AI_BASE_URL", "https://provider.test/v1");
    vi.stubEnv("AI_MODEL", "test-model");
    const fetchSpy = vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "" } }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "{not-json}" } }] }), { status: 200 }));

    const empty = await generateStructured<{ action: string }>({
      system: "Return JSON",
      prompt: "test",
      schemaName: "test_plan",
      schema: { type: "object", properties: { action: { type: "string" } }, required: ["action"], additionalProperties: false },
    });
    const malformed = await generateStructured<{ action: string }>({
      system: "Return JSON",
      prompt: "test",
      schemaName: "test_plan",
      schema: { type: "object", properties: { action: { type: "string" } }, required: ["action"], additionalProperties: false },
    });

    expect(empty).toEqual({ ok: false, error: "AI không trả về kế hoạch hợp lệ." });
    expect(malformed).toEqual({ ok: false, error: "AI trả về dữ liệu không đúng định dạng." });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
