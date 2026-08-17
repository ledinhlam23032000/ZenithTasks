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
});
