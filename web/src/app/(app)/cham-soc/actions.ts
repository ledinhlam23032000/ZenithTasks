"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { generateMessage } from "@/lib/ai";
import { auditRequired } from "@/lib/audit";

export type CareFormState = { ok?: boolean; error?: string; nonce?: number };

const schema = z.object({
  customerId: z.string().min(1),
  channel: z.enum(["NOTE", "ZALO", "SMS", "CALL", "EMAIL", "OTHER"]),
  direction: z.enum(["OUT", "IN"]).default("OUT"),
  content: z.string().trim().min(1, "Vui lòng nhập nội dung."),
  caseId: z.string().trim().optional(),
});

export async function addCareMessage(_prev: CareFormState, formData: FormData): Promise<CareFormState> {
  const user = await requireUser(["ADMIN", "MANAGER", "CARE"]);

  const parsed = schema.safeParse({
    customerId: formData.get("customerId") ?? "",
    channel: formData.get("channel") ?? "ZALO",
    direction: formData.get("direction") ?? "OUT",
    content: formData.get("content") ?? "",
    caseId: formData.get("caseId") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  const customer = await prisma.customer.findUnique({ where: { id: data.customerId }, select: { id: true } });
  if (!customer) return { error: "Khách hàng không tồn tại hoặc đã bị xóa." };
  if (data.caseId) {
    const linkedCase = await prisma.caseRecord.findUnique({ where: { id: data.caseId }, select: { customerId: true } });
    if (!linkedCase || linkedCase.customerId !== data.customerId) return { error: "Hồ sơ không thuộc khách hàng đã chọn." };
  }

  await prisma.$transaction(async (tx) => {
    const message = await tx.careMessage.create({
      data: {
        customerId: data.customerId,
        channel: data.channel,
        direction: data.direction,
        content: data.content,
        caseId: data.caseId || null,
        createdById: user.id,
      },
    });
    await auditRequired(tx, user.id, "CREATE_CARE", { entity: "CareMessage", entityId: message.id, meta: { customerId: data.customerId, caseId: data.caseId || null, channel: data.channel } });
  });

  return { ok: true, nonce: Date.now() };
}

const editSchema = z.object({
  id: z.string().min(1),
  channel: z.enum(["NOTE", "ZALO", "SMS", "CALL", "EMAIL", "OTHER"]),
  direction: z.enum(["OUT", "IN"]).default("OUT"),
  content: z.string().trim().min(1, "Vui lòng nhập nội dung."),
});

export async function updateCareMessage(_prev: CareFormState, formData: FormData): Promise<CareFormState> {
  const user = await requireUser(["ADMIN", "MANAGER", "CARE"]);

  const parsed = editSchema.safeParse({
    id: formData.get("id") ?? "",
    channel: formData.get("channel") ?? "ZALO",
    direction: formData.get("direction") ?? "OUT",
    content: formData.get("content") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const { id, channel, direction, content } = parsed.data;

  await prisma.$transaction(async (tx) => {
    const updated = await tx.careMessage.updateMany({ where: { id }, data: { channel, direction, content } });
    if (updated.count > 0) {
      await auditRequired(tx, user.id, "UPDATE_CARE", { entity: "CareMessage", entityId: id, meta: { channel, direction } });
    }
  });

  return { ok: true, nonce: Date.now() };
}

export async function deleteCareMessage(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN", "MANAGER", "CARE"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const m = await prisma.careMessage.findUnique({ where: { id }, select: { customerId: true } });
  if (!m) return;
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.careMessage.deleteMany({ where: { id } });
    if (deleted.count > 0) await auditRequired(tx, user.id, "DELETE_CARE", { entity: "CareMessage", entityId: id });
  });
  if (m?.customerId) revalidatePath(`/khach-hang/${m.customerId}`);
  revalidatePath("/cham-soc");
}

// ===== AI soạn tin gợi ý =====
export type AiDraftState = { ok?: boolean; text?: string; error?: string };

const PURPOSES: Record<string, string> = {
  "hoi-tham": "Hỏi thăm sức khoẻ và tình trạng sau khi khách đã làm dịch vụ.",
  "nhac-tai-kham": "Nhắc khách lịch tái khám sắp tới một cách nhẹ nhàng.",
  "cam-on": "Cảm ơn khách đã tin tưởng đến trung tâm và mời quay lại khi cần.",
  "uu-dai": "Giới thiệu ưu đãi/dịch vụ phù hợp một cách lịch sự, không gây khó chịu.",
};

/** Dùng AI soạn sẵn một tin nhắn chăm sóc — nhân sự xem/sửa rồi mới gửi. */
export async function draftCareMessage(_prev: AiDraftState, formData: FormData): Promise<AiDraftState> {
  await requireUser(["ADMIN", "MANAGER", "CARE"]);
  const customerId = String(formData.get("customerId") ?? "");
  const purposeKey = String(formData.get("purpose") ?? "").trim();
  const customNote = String(formData.get("note") ?? "").trim();
  const purpose = PURPOSES[purposeKey] || customNote || "Hỏi thăm khách hàng một cách thân thiện.";

  // Bối cảnh tối thiểu — KHÔNG gửi số điện thoại / dữ liệu nhạy cảm cho AI.
  let name = "quý khách";
  let lastService = "";
  if (customerId) {
    const c = await prisma.customer.findUnique({
      where: { id: customerId },
      select: {
        fullName: true,
        cases: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { services: { select: { name: true }, take: 1 } },
        },
      },
    });
    if (c) {
      name = c.fullName;
      lastService = c.cases[0]?.services[0]?.name ?? "";
    }
  }

  const system =
    "Bạn là nhân viên chăm sóc khách hàng của Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc. " +
    "Viết tin nhắn tiếng Việt: lịch sự, ấm áp, chuyên nghiệp, chân thành như người thật, ngắn gọn 2–4 câu. " +
    "Không hứa hẹn kết quả y khoa, không phóng đại, không dùng quá nhiều emoji. " +
    "CHỈ trả về nội dung tin nhắn, không thêm tiêu đề hay giải thích.";
  const prompt =
    `Tên khách: ${name}.` +
    (lastService ? ` Dịch vụ gần nhất: ${lastService}.` : "") +
    (customNote ? ` Yêu cầu thêm: ${customNote}.` : "") +
    ` Mục đích: ${purpose} Hãy viết 1 tin nhắn phù hợp để gửi cho khách.`;

  const r = await generateMessage({ system, prompt, maxTokens: 400 });
  if (!r.ok) return { error: r.error };
  return { ok: true, text: r.text };
}
