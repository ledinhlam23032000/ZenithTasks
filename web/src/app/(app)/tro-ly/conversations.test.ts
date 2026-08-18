import { describe, expect, it } from "vitest";
import { turnsToPrompt } from "./conversations";

describe("turnsToPrompt", () => {
  it("giữ thứ tự gần nhất và dùng nhãn ANH/EM dễ hiểu", () => {
    const result = turnsToPrompt([
      { role: "USER", content: "Xem công nợ" },
      { role: "ASSISTANT", content: "Em đang kiểm tra" },
    ]);
    expect(result).toContain("[1] ANH: Xem công nợ");
    expect(result).toContain("[2] EM: Em đang kiểm tra");
  });

  it("giới hạn context và ưu tiên phần cuối khi lịch sử quá dài", () => {
    const result = turnsToPrompt(Array.from({ length: 30 }, (_, index) => ({ role: "USER", content: `${index}: ${"x".repeat(4_000)}` })));
    expect(result.length).toBeLessThanOrEqual(24_100);
    expect(result).toContain("29:");
    expect(result).toContain("Các lượt cũ hơn đã được tóm tắt vào memory");
  });
});
