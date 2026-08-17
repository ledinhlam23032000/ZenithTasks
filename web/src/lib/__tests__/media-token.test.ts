import { describe, it, expect, beforeAll } from "vitest";
import { signMediaToken, verifyMediaToken, withMediaToken } from "../media-token";

beforeAll(() => {
  process.env.AUTH_SECRET = "test-secret-for-media-token-do-not-use-in-prod";
});

describe("media-token — vé xem ảnh ngắn hạn", () => {
  it("vé hợp lệ cho đúng tệp được chấp nhận", () => {
    const token = signMediaToken("anh1.jpg");
    expect(verifyMediaToken("anh1.jpg", token)).toBe(true);
  });

  it("vé của tệp này KHÔNG mở được tệp khác", () => {
    const token = signMediaToken("anh1.jpg");
    expect(verifyMediaToken("anh2.jpg", token)).toBe(false);
  });

  it("vé hết hạn bị từ chối", () => {
    const token = signMediaToken("anh1.jpg", -1000); // đã hết hạn
    expect(verifyMediaToken("anh1.jpg", token)).toBe(false);
  });

  it("token rỗng / sai định dạng bị từ chối", () => {
    expect(verifyMediaToken("anh1.jpg", null)).toBe(false);
    expect(verifyMediaToken("anh1.jpg", "")).toBe(false);
    expect(verifyMediaToken("anh1.jpg", "khongcodau")).toBe(false);
    expect(verifyMediaToken("anh1.jpg", "9999999999999.saibet")).toBe(false);
  });

  it("chữ ký giả mạo bị từ chối", () => {
    const exp = Date.now() + 60_000;
    expect(verifyMediaToken("anh1.jpg", `${exp}.AAAAAAAAAAAAAAAAAAAAAAAAAAAA`)).toBe(false);
  });

  it("withMediaToken tạo URL /media kèm vé từ /uploads hoặc /media", () => {
    const u1 = withMediaToken("/uploads/x.jpg");
    expect(u1.startsWith("/media/x.jpg?t=")).toBe(true);
    const u2 = withMediaToken("/media/y.png");
    expect(u2.startsWith("/media/y.png?t=")).toBe(true);
    // URL ngoài giữ nguyên
    expect(withMediaToken("https://cdn.example.com/z.jpg")).toBe("https://cdn.example.com/z.jpg");
    expect(withMediaToken("")).toBe("");
  });

  it("URL do withMediaToken sinh ra verify được", () => {
    const url = withMediaToken("/media/abc.webp");
    const t = url.split("?t=")[1];
    expect(verifyMediaToken("abc.webp", t)).toBe(true);
  });
});
