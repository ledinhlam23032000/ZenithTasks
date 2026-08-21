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

  it("loại lỗi AI tạm thời khỏi context nhưng giữ lượt người dùng mới nhất", () => {
    const result = turnsToPrompt([
      { role: "USER", content: "Xem doanh thu tháng này" },
      { role: "ASSISTANT", content: "AI không trả về kế hoạch hợp lệ." },
      { role: "ASSISTANT", content: "Lỗi tạm thời", metadata: { transientError: true } },
      { role: "USER", content: "Hãy thử lại bằng phạm vi 30 ngày." },
    ]);
    expect(result).not.toContain("AI không trả về kế hoạch hợp lệ");
    expect(result).not.toContain("Lỗi tạm thời");
    expect(result).toContain("[2] ANH: Hãy thử lại bằng phạm vi 30 ngày.");
  });

  it("trả fallback trung thực khi không còn lượt đáng tin cậy", () => {
    expect(turnsToPrompt([{ role: "ASSISTANT", content: "Không gọi được dịch vụ AI." }])).toBe("Chưa có lượt hội thoại đáng tin cậy gần đây.");
  });
});
