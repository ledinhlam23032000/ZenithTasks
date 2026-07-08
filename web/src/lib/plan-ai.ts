// ============================================================================
// AI SOẠN KẾ HOẠCH — sinh dữ liệu CÓ CẤU TRÚC (JSON) từ mô tả mục tiêu của người
// dùng. Dùng chung `generateMessage()` ở lib/ai.ts (KHÔNG sửa file đó — trung lập
// nhà cung cấp, không nên gắn JSON-mode riêng cho 1 hãng). AI CHỈ soạn BẢN NHÁP —
// người dùng xem/sửa rồi mới bấm lưu thật (xem ke-hoach/actions.ts).
//
// Chiến lược phòng thủ: ép AI chỉ trả về 1 khối ```json``` → trích khối đó (có rào
// chắn → không rào chắn → giữa "{" đầu và "}" cuối) → JSON.parse (try/catch) →
// validate bằng zod → nếu mảng vượt giới hạn thì CẮT BỚT rồi thử lại thay vì báo
// lỗi ngay (model hay soạn dư 1-2 mục so với giới hạn đã yêu cầu). Không bao giờ
// throw ra ngoài — luôn trả {ok,...} hoặc {error}.
// ============================================================================

import { z } from "zod";

export const PLAN_DRAFT_MAX_TASKS = 12;
export const PLAN_DRAFT_MAX_SUBTASKS = 8;

export const PLAN_DRAFT_SYSTEM = `Bạn là trợ lý lập kế hoạch công việc cho quản lý phòng khám thẩm mỹ. Đọc MỤC TIÊU của người dùng rồi lập một KẾ HOẠCH có cấu trúc: các nhiệm vụ chính, mỗi nhiệm vụ chính có thể có nhiệm vụ phụ (CHỈ 1 cấp phụ, không lồng sâu hơn), và ghi chú chi tiết khi cần.

BẮT BUỘC: CHỈ trả lời bằng ĐÚNG MỘT khối mã dạng \`\`\`json ... \`\`\`. KHÔNG viết bất kỳ lời dẫn, giải thích, hay văn bản nào khác ngoài khối mã này.

Cấu trúc JSON PHẢI đúng như sau (không đổi tên trường, không thêm/bớt trường):
{
  "title": "Tên kế hoạch, ngắn gọn",
  "note": "Mô tả/ghi chú tổng quan (chuỗi rỗng nếu không cần)",
  "tasks": [
    {
      "title": "Tên nhiệm vụ chính",
      "note": "Ghi chú chi tiết (chuỗi rỗng nếu không cần)",
      "subtasks": [ { "title": "Tên nhiệm vụ phụ", "note": "..." } ]
    }
  ]
}

Ràng buộc: tối đa ${PLAN_DRAFT_MAX_TASKS} nhiệm vụ chính; mỗi nhiệm vụ chính tối đa ${PLAN_DRAFT_MAX_SUBTASKS} nhiệm vụ phụ; "subtasks" có thể là mảng rỗng []. Viết tiếng Việt, ngắn gọn, thực tế cho phòng khám thẩm mỹ. KHÔNG bịa số liệu/tên người/ngày tháng cụ thể nếu người dùng không cung cấp.`;

export function buildPlanDraftPrompt(goal: string, retry = false): string {
  const base = `MỤC TIÊU CỦA NGƯỜI DÙNG:\n${goal}\n\nHãy lập kế hoạch theo đúng cấu trúc JSON đã quy định.`;
  return retry
    ? `${base}\n\nLƯU Ý: lần trước bạn trả lời sai định dạng — lần này CHỈ trả về đúng 1 khối JSON như yêu cầu, không thêm chữ nào khác.`
    : base;
}

const planDraftTaskSchema = z.object({
  title: z.string().trim().min(1).max(200),
  note: z.string().trim().max(2000).nullable().optional(),
});

export const planDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  note: z.string().trim().max(2000).nullable().optional(),
  tasks: z
    .array(
      planDraftTaskSchema.extend({
        subtasks: z.array(planDraftTaskSchema).max(PLAN_DRAFT_MAX_SUBTASKS).default([]),
      }),
    )
    .min(1)
    .max(PLAN_DRAFT_MAX_TASKS),
});

export type PlanDraft = z.infer<typeof planDraftSchema>;

/** Trích khối JSON từ văn bản AI trả về: có rào chắn ```json``` → rào chắn thường → giữa { } đầu/cuối. */
export function extractJsonBlock(text: string): string | null {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i) ?? text.match(/```\s*([\s\S]*?)```/);
  if (fenced?.[1]) return fenced[1].trim();
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) return text.slice(first, last + 1).trim();
  return null;
}

export type ParsePlanDraftResult = { ok: true; draft: PlanDraft } | { ok: false; error: string };

/** Parse + validate phòng thủ toàn bộ (không bao giờ throw). */
export function parsePlanDraft(text: string): ParsePlanDraftResult {
  const block = extractJsonBlock(text);
  if (!block) return { ok: false, error: "AI không trả về đúng định dạng JSON." };

  let raw: unknown;
  try {
    raw = JSON.parse(block);
  } catch {
    return { ok: false, error: "AI trả về JSON không hợp lệ." };
  }

  const first = planDraftSchema.safeParse(raw);
  if (first.success) return { ok: true, draft: first.data };

  // Model hay soạn dư số lượng so với giới hạn — cắt bớt rồi thử lại 1 lần trước khi báo lỗi.
  if (raw && typeof raw === "object" && Array.isArray((raw as { tasks?: unknown }).tasks)) {
    const trimmed = {
      ...(raw as Record<string, unknown>),
      tasks: ((raw as { tasks: unknown[] }).tasks as Array<Record<string, unknown>>)
        .slice(0, PLAN_DRAFT_MAX_TASKS)
        .map((t) => ({
          ...t,
          subtasks: Array.isArray(t.subtasks) ? (t.subtasks as unknown[]).slice(0, PLAN_DRAFT_MAX_SUBTASKS) : [],
        })),
    };
    const second = planDraftSchema.safeParse(trimmed);
    if (second.success) return { ok: true, draft: second.data };
  }

  return { ok: false, error: "Dữ liệu AI trả về thiếu/sai định dạng. Vui lòng thử lại hoặc mô tả rõ hơn." };
}
