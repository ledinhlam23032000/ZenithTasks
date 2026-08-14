"use server";

import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { aiConfigured, generateMessage } from "@/lib/ai";
import { getAssistantContext } from "@/lib/assistant-data";
import { formatAssistantContext, ASSISTANT_SYSTEM, BUSINESS_RULES_KNOWLEDGE } from "@/lib/assistant";
import { CHANGE_REQUEST_SYSTEM, buildChangeRequestPrompt, parseChangeRequest } from "@/lib/assistant-request-ai";
import { audit, auditRequired } from "@/lib/audit";

export type AskState = { ok?: boolean; answer?: string; error?: string };

/**
 * Hỏi trợ lý AI về số liệu vận hành. Máy chủ tính sẵn bối cảnh số liệu (không gồm
 * SĐT/dữ liệu y khoa) rồi đưa cho AI trả lời — AI KHÔNG truy cập thẳng cơ sở dữ liệu.
 */
export async function askAssistant(_prev: AskState, formData: FormData): Promise<AskState> {
  const user = await requireCap("mod:tro-ly");

  if (!aiConfigured()) {
    return { error: "Chưa bật AI. Vào máy chủ chạy Cai-AI-Key (đặt AI_API_KEY) rồi thử lại." };
  }

  const question = String(formData.get("question") ?? "").trim();
  if (!question) return { error: "Vui lòng nhập câu hỏi." };
  if (question.length > 500) return { error: "Câu hỏi quá dài (tối đa 500 ký tự)." };

  const ctx = await getAssistantContext();
  const prompt =
    `QUY TẮC NGHIỆP VỤ:\n${BUSINESS_RULES_KNOWLEDGE}\n\n` +
    `DỮ LIỆU:\n${formatAssistantContext(ctx)}\n\n` +
    `CÂU HỎI CỦA QUẢN LÝ: ${question}`;

  const r = await generateMessage({ system: ASSISTANT_SYSTEM, prompt, maxTokens: 700 });
  await audit(user.id, "ASK_ASSISTANT", { entity: "Assistant", meta: { ok: r.ok } });
  if (!r.ok) return { error: r.error };
  return { ok: true, answer: r.text };
}

export type LogRequestState = { ok?: boolean; error?: string; planId?: string; taskId?: string };

const ASSISTANT_INBOX_PLAN_TITLE = "Yêu cầu từ Trợ lý AI";

/**
 * Ghi lại 1 câu hỏi/yêu cầu từ Trợ Lý AI thành 1 nhiệm vụ trong Lập kế hoạch,
 * để quản lý xem/duyệt rồi giao cho lập trình xử lý. TRỢ LÝ KHÔNG TỰ SỬA HỆ
 * THỐNG — hàm này chỉ tóm tắt (nếu có AI) và lưu, không đụng tới code/schema.
 */
export async function logAssistantChangeRequest(_prev: LogRequestState, formData: FormData): Promise<LogRequestState> {
  const user = await requireCap("mod:tro-ly");
  const question = String(formData.get("question") ?? "").trim();
  const answer = String(formData.get("answer") ?? "").trim();
  if (!question) return { error: "Thiếu nội dung yêu cầu." };
  if (question.length > 500) return { error: "Yêu cầu quá dài (tối đa 500 ký tự)." };

  // Tóm tắt bằng AI nếu có; nếu AI tắt hoặc trả sai định dạng, vẫn ghi lại
  // được bằng nguyên văn câu hỏi — không để lỗi tóm tắt chặn việc ghi nhận.
  let title = question.length > 120 ? `${question.slice(0, 117)}...` : question;
  let note = `Câu hỏi/yêu cầu gốc: ${question}${answer ? `\n\nTrả lời của trợ lý AI lúc đó:\n${answer}` : ""}`;

  if (aiConfigured()) {
    const r = await generateMessage({ system: CHANGE_REQUEST_SYSTEM, prompt: buildChangeRequestPrompt(question, answer), maxTokens: 500 });
    if (r.ok) {
      const parsed = parseChangeRequest(r.text);
      if (parsed.ok) {
        title = parsed.draft.title;
        note = `${parsed.draft.note ?? ""}\n\n— Nguyên văn từ ${user.fullName}: "${question}"`.trim();
      }
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    let plan = await tx.plan.findFirst({ where: { title: ASSISTANT_INBOX_PLAN_TITLE } });
    if (!plan) {
      plan = await tx.plan.create({
        data: {
          title: ASSISTANT_INBOX_PLAN_TITLE,
          note: "Các yêu cầu thay đổi/sửa hệ thống được Trợ lý AI ghi lại từ trang Trợ Lý — xem, chọn lọc rồi giao cho lập trình xử lý. Trợ lý KHÔNG tự sửa hệ thống.",
          aiGenerated: true,
          createdById: user.id,
        },
      });
    }
    const max = await tx.planTask.aggregate({ where: { planId: plan.id, parentId: null }, _max: { order: true } });
    const task = await tx.planTask.create({
      data: { planId: plan.id, title, note, order: (max._max.order ?? -1) + 1 },
    });
    await auditRequired(tx, user.id, "LOG_ASSISTANT_REQUEST", { entity: "PlanTask", entityId: task.id, meta: { planId: plan.id } });
    return { planId: plan.id, taskId: task.id };
  });

  return { ok: true, ...result };
}
