import { describe, it, expect } from "vitest";
import { extractJsonBlock, parsePlanDraft, buildPlanDraftPrompt, PLAN_DRAFT_MAX_TASKS, PLAN_DRAFT_MAX_SUBTASKS } from "../plan-ai";

const VALID = {
  title: "Chuẩn bị khai trương chi nhánh 2",
  note: "Mục tiêu quý 3",
  tasks: [
    {
      title: "Tìm mặt bằng",
      note: "",
      subtasks: [
        { title: "Khảo sát khu vực trung tâm", note: "" },
        { title: "Đàm phán hợp đồng thuê", note: "Ưu tiên hợp đồng 3 năm" },
      ],
    },
    { title: "Tuyển nhân sự", note: "", subtasks: [] },
  ],
};

describe("extractJsonBlock", () => {
  it("trích khối có rào chắn ```json```", () => {
    const text = "Đây là kế hoạch:\n```json\n" + JSON.stringify(VALID) + "\n```\nCảm ơn.";
    const block = extractJsonBlock(text);
    expect(block).toBeTruthy();
    expect(JSON.parse(block!)).toEqual(VALID);
  });

  it("trích khối rào chắn thường (không ghi json)", () => {
    const text = "```\n" + JSON.stringify(VALID) + "\n```";
    const block = extractJsonBlock(text);
    expect(JSON.parse(block!)).toEqual(VALID);
  });

  it("không có rào chắn → lấy giữa { đầu và } cuối", () => {
    const text = "Trả lời của tôi: " + JSON.stringify(VALID) + " hết rồi.";
    const block = extractJsonBlock(text);
    expect(JSON.parse(block!)).toEqual(VALID);
  });

  it("không có JSON nào → null", () => {
    expect(extractJsonBlock("Xin lỗi tôi không hiểu câu hỏi.")).toBeNull();
  });
});

describe("parsePlanDraft", () => {
  it("ca hợp lệ đầy đủ", () => {
    const r = parsePlanDraft("```json\n" + JSON.stringify(VALID) + "\n```");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.title).toBe(VALID.title);
      expect(r.draft.tasks).toHaveLength(2);
      expect(r.draft.tasks[0].subtasks).toHaveLength(2);
    }
  });

  it("JSON hỏng (cú pháp sai) → lỗi thân thiện", () => {
    const r = parsePlanDraft("```json\n{ title: broken }\n```");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toBeTruthy();
  });

  it("không có khối JSON nào → lỗi thân thiện", () => {
    const r = parsePlanDraft("Tôi cần thêm thông tin để lập kế hoạch.");
    expect(r.ok).toBe(false);
  });

  it("thiếu title (sai schema) → lỗi thân thiện", () => {
    const bad = { note: "", tasks: [{ title: "A", note: "", subtasks: [] }] };
    const r = parsePlanDraft("```json\n" + JSON.stringify(bad) + "\n```");
    expect(r.ok).toBe(false);
  });

  it("mảng vượt giới hạn → tự cắt bớt rồi thành công", () => {
    const overshoot = {
      title: "Kế hoạch lớn",
      note: "",
      tasks: Array.from({ length: PLAN_DRAFT_MAX_TASKS + 3 }, (_, i) => ({
        title: `Nhiệm vụ ${i + 1}`,
        note: "",
        subtasks: Array.from({ length: PLAN_DRAFT_MAX_SUBTASKS + 2 }, (_, j) => ({ title: `Phụ ${j + 1}`, note: "" })),
      })),
    };
    const r = parsePlanDraft("```json\n" + JSON.stringify(overshoot) + "\n```");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.draft.tasks).toHaveLength(PLAN_DRAFT_MAX_TASKS);
      expect(r.draft.tasks[0].subtasks).toHaveLength(PLAN_DRAFT_MAX_SUBTASKS);
    }
  });
});

describe("buildPlanDraftPrompt", () => {
  it("chèn mục tiêu vào prompt", () => {
    const p = buildPlanDraftPrompt("Mở rộng chi nhánh mới");
    expect(p).toContain("Mở rộng chi nhánh mới");
  });
  it("bản thử lại có ghi chú nhắc định dạng", () => {
    const p = buildPlanDraftPrompt("Mục tiêu X", true);
    expect(p).toContain("sai định dạng");
  });
});
