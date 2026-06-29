"use server";

import { requireCap } from "@/lib/auth";
import { aiConfigured, generateMessage } from "@/lib/ai";
import { getAssistantContext } from "@/lib/assistant-data";
import { formatAssistantContext, ASSISTANT_SYSTEM } from "@/lib/assistant";
import { audit } from "@/lib/audit";

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
  const prompt = `DỮ LIỆU:\n${formatAssistantContext(ctx)}\n\nCÂU HỎI CỦA QUẢN LÝ: ${question}`;

  const r = await generateMessage({ system: ASSISTANT_SYSTEM, prompt, maxTokens: 700 });
  await audit(user.id, "ASK_ASSISTANT", { entity: "Assistant", meta: { ok: r.ok } });
  if (!r.ok) return { error: r.error };
  return { ok: true, answer: r.text };
}
