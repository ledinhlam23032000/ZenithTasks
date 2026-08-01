import { describe, it, expect, beforeAll } from "vitest";
import { encryptSecret, decryptSecret } from "../secret-crypto";

beforeAll(() => {
  process.env.PHONE_ENC_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("secret-crypto — mã hoá access/refresh token kênh", () => {
  it("mã hoá rồi giải mã ra đúng chuỗi gốc", () => {
    const raw = "some-access-token-abc.123";
    const enc = encryptSecret(raw);
    expect(enc).not.toBe(raw);
    expect(decryptSecret(enc)).toBe(raw);
  });

  it("mỗi lần mã hoá cho ra chuỗi khác nhau (IV ngẫu nhiên) nhưng vẫn giải mã đúng", () => {
    const raw = "refresh-token-xyz";
    const a = encryptSecret(raw);
    const b = encryptSecret(raw);
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(raw);
    expect(decryptSecret(b)).toBe(raw);
  });

  it("chuỗi rỗng cũng roundtrip đúng", () => {
    const enc = encryptSecret("");
    expect(decryptSecret(enc)).toBe("");
  });
});
