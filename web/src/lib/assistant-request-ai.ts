// ============================================================================
// TÓM TẮT YÊU CẦU SỬA HỆ THỐNG (Trợ Lý AI) — sinh {title, note} CÓ CẤU TRÚC
// (JSON) từ 1 đoạn hỏi-đáp, để ghi thành 1 nhiệm vụ trong Lập kế hoạch cho
// lập trình xử lý sau. Trợ lý AI KHÔNG tự sửa hệ thống — bước này chỉ tóm tắt
// để quản lý xem lại/duyệt trước khi giao việc. Theo đúng khuôn AI-JSON đã có
// ở lib/plan-ai.ts (xem BAN-GIAO.md mục 8.10).
// ============================================================================

import { z } from "zod";
import { extractJsonBlock } from "./plan-ai";

export const CHANGE_REQUEST_SYSTEM = `Bạn tóm tắt 1 đoạn hội thoại giữa quản lý phòng khám thẩm mỹ và trợ lý AI thành 1 YÊU CẦU THAY ĐỔI HỆ THỐNG rõ ràng, để gửi cho lập trình viên xử lý.

BẮT BUỘC: CHỈ trả lời bằng ĐÚNG MỘT khối mã dạng \`\`\`json ... \`\`\`. KHÔNG viết lời dẫn hay giải thích nào khác ngoài khối mã này.

Cấu trúc JSON PHẢI đúng như sau (không đổi tên trường, không thêm/bớt trường):
{
  "title": "Tiêu đề ngắn gọn (tối đa 15 từ), nêu rõ muốn thay đổi điều gì",
  "note": "Mô tả chi tiết: hiện đang như thế nào (nếu biết), muốn đổi thành thế nào, lý do (nếu có trong hội thoại)"
}

Chỉ dựa trên đúng nội dung hội thoại được cung cấp — KHÔNG bịa thêm chi tiết kỹ thuật, tên hàm, hay tên file không có trong đó.`;

export function buildChangeRequestPrompt(question: string, answer: string): string {
  return (
    `CÂU HỎI/YÊU CẦU CỦA QUẢN LÝ:\n${question}\n\n` +
    (answer ? `TRẢ LỜI CỦA TRỢ LÝ:\n${answer}\n\n` : "") +
    `Hãy tóm tắt thành JSON theo đúng cấu trúc đã quy định.`
  );
}

const changeRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
  note: z.string().trim().max(2000).nullable().optional(),
});

export type ChangeRequestDraft = z.infer<typeof changeRequestSchema>;
export type ParseChangeRequestResult = { ok: true; draft: ChangeRequestDraft } | { ok: false; error: string };

/** Parse + validate phòng thủ (không bao giờ throw) — cùng chiến lược với parsePlanDraft(). */
export function parseChangeRequest(text: string): ParseChangeRequestResult {
  const block = extractJsonBlock(text);
  if (!block) return { ok: false, error: "AI không trả về đúng định dạng JSON." };

  let raw: unknown;
  try {
    raw = JSON.parse(block);
  } catch {
    return { ok: false, error: "AI trả về JSON không hợp lệ." };
  }

  const parsed = changeRequestSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "Dữ liệu AI trả về thiếu/sai định dạng." };
  return { ok: true, draft: parsed.data };
}
