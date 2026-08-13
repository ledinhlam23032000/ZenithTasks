import { describe, expect, it } from "vitest";
import { redactPhoneLikeText } from "../phone";

describe("redactPhoneLikeText", () => {
  it("redacts Vietnamese phone formats while keeping surrounding text", () => {
    expect(redactPhoneLikeText("Gọi 0987 654 321 sau 18h")).toBe("Gọi [SĐT đã ẩn] sau 18h");
    expect(redactPhoneLikeText("Số +84 987-654-321")).toBe("Số +[SĐT đã ẩn]");
  });

  it("does not redact ordinary short numbers", () => {
    expect(redactPhoneLikeText("Tầng 3, phòng 12")).toBe("Tầng 3, phòng 12");
  });
});
