import { describe, expect, it } from "vitest";
import { applyClarificationChoice, buildClarificationPayload, clarificationAnswer, findActiveClarificationPayload, parseClarificationChoice } from "./ai-clarification";

describe("AI clarification A/B/C/D", () => {
  it("creates a mechanism clarification with four choices and draft-only assumptions", () => {
    const payload = buildClarificationPayload("Tạo cơ chế hoa hồng cho dự án Cellarisca");
    expect(payload?.options.map((item) => item.id)).toEqual(["A", "B", "C", "D"]);
    expect(payload?.status).toBe("DRAFT");
    expect(payload?.assumptions.some((item) => item.includes("Chưa được phê duyệt"))).toBe(true);
    expect(clarificationAnswer(payload!)).toContain("A.");
  });

  it("does not ask mechanism questions for unrelated requests", () => {
    expect(buildClarificationPayload("Hôm nay có bao nhiêu lịch hẹn?")).toBeNull();
  });

  it("parses explicit user choices only", () => {
    expect(parseClarificationChoice("A")).toBe("A");
    expect(parseClarificationChoice("Chọn C - theo bậc")).toBe("C");
    expect(parseClarificationChoice("Tôi đồng ý")).toBeNull();
  });

  it("does not reuse a clarification after a draft has been recorded", () => {
    const payload = buildClarificationPayload("Tạo cơ chế chiết khấu cho dự án demo")!;
    expect(findActiveClarificationPayload([{ role: "ASSISTANT", metadata: { clarification: payload } }])).toEqual(payload);
    expect(findActiveClarificationPayload([{ role: "ASSISTANT", metadata: { clarification: payload } }, { role: "ASSISTANT", metadata: { clarificationDraft: { status: "DRAFT" } } }])).toBeNull();
  });

  it("turns a confirmed choice into an inactive draft with evidence", () => {
    const payload = buildClarificationPayload("Tạo cơ chế hoa hồng cho dự án demo")!;
    const draft = applyClarificationChoice(payload, "D");
    expect(draft?.status).toBe("DRAFT");
    expect(draft?.draftConfig.activated).toBe(false);
    expect(draft?.draftConfig.basis).toBe("settlement_pool");
    expect(draft?.evidence.choice).toBe("D");
    expect(draft?.nextQuestions.length).toBe(3);
  });
});
