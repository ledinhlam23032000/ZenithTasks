import { describe, it, expect } from "vitest";
import { parseChangeRequest, buildChangeRequestPrompt } from "../assistant-request-ai";

const VALID = {
  title: "Đổi cách tính hoa hồng theo thực thu",
  note: "Hiện nhập tay hằng tháng; quản lý muốn tự động gợi ý theo thực thu.",
};

describe("parseChangeRequest", () => {
  it("ca hợp lệ có rào chắn json", () => {
    const r = parseChangeRequest("```json\n" + JSON.stringify(VALID) + "\n```");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.title).toBe(VALID.title);
      expect(r.draft.note).toBe(VALID.note);
    }
  });

  it("ca hợp lệ không rào chắn (giữa { và })", () => {
    const r = parseChangeRequest("Đây là tóm tắt: " + JSON.stringify(VALID) + " xong rồi.");
    expect(r.ok).toBe(true);
  });

  it("JSON hỏng → lỗi thân thiện, không throw", () => {
    const r = parseChangeRequest("```json\n{ title: broken }\n```");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeTruthy();
  });

  it("không có khối JSON nào → lỗi thân thiện", () => {
    const r = parseChangeRequest("Xin lỗi, tôi không hiểu yêu cầu.");
    expect(r.ok).toBe(false);
  });

  it("thiếu title (sai schema) → lỗi thân thiện", () => {
    const r = parseChangeRequest("```json\n" + JSON.stringify({ note: "chỉ có ghi chú" }) + "\n```");
    expect(r.ok).toBe(false);
  });

  it("note vắng mặt vẫn hợp lệ (optional)", () => {
    const r = parseChangeRequest("```json\n" + JSON.stringify({ title: "Chỉ có tiêu đề" }) + "\n```");
    expect(r.ok).toBe(true);
  });
});

describe("buildChangeRequestPrompt", () => {
  it("chèn cả câu hỏi và câu trả lời khi có đủ", () => {
    const p = buildChangeRequestPrompt("Đổi cách tính hoa hồng", "Hiện tại nhập tay hằng tháng.");
    expect(p).toContain("Đổi cách tính hoa hồng");
    expect(p).toContain("Hiện tại nhập tay hằng tháng.");
  });

  it("bỏ qua phần trả lời khi rỗng", () => {
    const p = buildChangeRequestPrompt("Đổi cách tính hoa hồng", "");
    expect(p).not.toContain("TRẢ LỜI CỦA TRỢ LÝ");
  });
});
