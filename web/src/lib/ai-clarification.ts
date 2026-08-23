export type ClarificationChoice = "A" | "B" | "C" | "D";

export type ClarificationOption = {
  id: ClarificationChoice;
  label: string;
  impact: string;
  draftPatch: Record<string, string | number | boolean>;
};

export type ClarificationPayload = {
  version: 1;
  kind: "MECHANISM_SETUP" | "GENERIC_SCOPE";
  question: string;
  why: string;
  options: ClarificationOption[];
  requiredFields: string[];
  assumptions: string[];
  status: "DRAFT";
  evidence: { source: "user"; text: string };
};

const mechanismSignals = /(hoa hồng|chiết khấu|doanh thu|revenue.?share|commission|thưởng|cơ chế|chia\s+(?:hoa hồng|doanh thu|lợi nhuận|nhiều bên)|mechanism)/i;

export function buildClarificationPayload(question: string): ClarificationPayload | null {
  if (!mechanismSignals.test(question)) return null;
  return {
    version: 1,
    kind: "MECHANISM_SETUP",
    question: "Cơ chế này nên lấy nền tính nào và áp dụng theo cách nào?",
    why: "Nếu chốt nhầm nền tính hoặc thời điểm áp dụng, kết quả tiền có thể sai. Em chỉ tạo bản nháp, chưa kích hoạt hay tính vào thanh toán.",
    options: [
      { id: "A", label: "Theo doanh số gộp", impact: "Dễ hiểu, tính trên tổng doanh số trước điều chỉnh.", draftPatch: { basis: "gross_sales", tierMode: "flat" } },
      { id: "B", label: "Theo doanh số thực thu", impact: "An toàn dòng tiền, chỉ tính phần đã thu được.", draftPatch: { basis: "collected_revenue", tierMode: "flat" } },
      { id: "C", label: "Theo bậc doanh số", impact: "Khuyến khích tăng trưởng; tỷ lệ thay đổi theo từng ngưỡng.", draftPatch: { basis: "gross_sales", tierMode: "progressive" } },
      { id: "D", label: "Chia nhiều bên/vị trí", impact: "Phù hợp revenue sharing; cần khai báo tỷ lệ và thứ tự ưu tiên.", draftPatch: { basis: "settlement_pool", tierMode: "split" } },
    ],
    requiredFields: ["project", "basis", "tierMode", "effectiveDate"],
    assumptions: ["Chưa có ngày hiệu lực.", "Chưa có tỷ lệ/bậc cụ thể.", "Chưa được phê duyệt và chưa áp dụng vào dữ liệu thật."],
    status: "DRAFT",
    evidence: { source: "user", text: question.slice(0, 1200) },
  };
}

export function findActiveClarificationPayload(turns: ReadonlyArray<{ role: string; metadata?: unknown | null }>): ClarificationPayload | null {
  let active: ClarificationPayload | null = null;
  for (const turn of turns) {
    if (turn.role !== "ASSISTANT" || !turn.metadata || typeof turn.metadata !== "object" || Array.isArray(turn.metadata)) continue;
    const metadata = turn.metadata as Record<string, unknown>;
    if (metadata.clarification) active = metadata.clarification as ClarificationPayload;
    if (metadata.clarificationDraft) active = null;
  }
  return active;
}

export function parseClarificationChoice(text: string): ClarificationChoice | null {
  const normalized = text.trim().toUpperCase();
  const match = normalized.match(/^(?:CHỌN\s*)?([ABCD])(?:\b|[.:)\-])/u);
  return match?.[1] as ClarificationChoice | undefined ?? null;
}

export function applyClarificationChoice(payload: ClarificationPayload, choice: ClarificationChoice) {
  const option = payload.options.find((item) => item.id === choice);
  if (!option) return null;
  const draftConfig: Record<string, string | number | boolean> = { ...option.draftPatch, source: "confirmed_user_choice", activated: false };
  return {
    status: "DRAFT" as const,
    selected: choice,
    label: option.label,
    impact: option.impact,
    draftConfig,
    evidence: { ...payload.evidence, choice },
    nextQuestions: ["Dự án cụ thể là gì?", "Ngày hiệu lực mong muốn là ngày nào?", "Anh muốn nhập tỷ lệ/bậc ngay hay để bản nháp trống để rà soát trước?"],
  };
}

export function clarificationAnswer(payload: ClarificationPayload) {
  return `${payload.question}\n\n${payload.why}\n\n${payload.options.map((option) => `${option.id}. ${option.label} — ${option.impact}`).join("\n")}\n\nPhạm vi còn thiếu: ${payload.requiredFields.join(", ")}.`;
}
