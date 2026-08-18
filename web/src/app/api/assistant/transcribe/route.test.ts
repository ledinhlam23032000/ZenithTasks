import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  requireCap: vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMIN" }),
}));

import { POST } from "./route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

function requestWith(file: File) {
  const form = new FormData();
  form.set("audio", file);
  return new Request("http://localhost/api/assistant/transcribe", { method: "POST", body: form });
}

describe("POST /api/assistant/transcribe", () => {
  it("từ chối file vượt quá 16MB trước khi gọi provider", async () => {
    vi.stubEnv("VOICE_API_KEY", "voice-key");
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await POST(requestWith(new File([new Uint8Array(16 * 1024 * 1024 + 1)], "voice.webm", { type: "audio/webm" })));
    expect(response.status).toBe(413);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("trả transcript tiếng Việt từ provider", async () => {
    vi.stubEnv("VOICE_API_KEY", "voice-key");
    vi.stubEnv("VOICE_BASE_URL", "https://voice.test/v1");
    vi.stubEnv("VOICE_MODEL", "whisper-test");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ text: "Xem công nợ hiện tại" }), { status: 200 }));
    const response = await POST(requestWith(new File(["audio"], "voice.webm", { type: "audio/webm" })));
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, text: "Xem công nợ hiện tại" });
    expect(fetchSpy).toHaveBeenCalledWith("https://voice.test/v1/audio/transcriptions", expect.objectContaining({ method: "POST" }));
  });

  it("báo lỗi cấu hình rõ ràng khi chưa có voice key", async () => {
    const response = await POST(requestWith(new File(["audio"], "voice.webm", { type: "audio/webm" })));
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({ ok: false, error: expect.stringContaining("VOICE_API_KEY") });
  });
});
