"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser, requireCap } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { generateMessage } from "@/lib/ai";
import { decryptSecret } from "@/lib/secret-crypto";
import { ensureZaloAccessToken, sendZaloTextMessage } from "@/lib/channels/zalo";
import { sendFacebookTextMessage } from "@/lib/channels/facebook";
import { recordOutboundMessage } from "@/lib/channels/conversations";

// Vai trò được thao tác hộp thư — giống hệt danh sách dùng cho CareMessage (addCareMessage)
// để nhất quán quy ước "cổ đông chỉ xem" trong toàn bộ mục Chăm sóc KH.
const CARE_WRITE_ROLES = ["ADMIN", "MANAGER", "CARE"] as const;

export type ReplyState = { ok?: boolean; error?: string; nonce?: number };

const replySchema = z.object({
  conversationId: z.string().min(1),
  text: z.string().trim().min(1, "Vui lòng nhập nội dung."),
});

/** Gửi tin trả lời khách qua đúng kênh (Zalo OA hoặc Facebook) của hội thoại. */
export async function sendChannelReply(_prev: ReplyState, formData: FormData): Promise<ReplyState> {
  const user = await requireUser([...CARE_WRITE_ROLES]);
  const parsed = replySchema.safeParse({
    conversationId: formData.get("conversationId") ?? "",
    text: formData.get("text") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

  const conversation = await prisma.conversation.findUnique({
    where: { id: parsed.data.conversationId },
    include: { channelAccount: true },
  });
  if (!conversation) return { error: "Không tìm thấy hội thoại." };
  if (!conversation.channelAccount.active) {
    return { error: "Kênh này đã ngắt kết nối — vào trang Kết nối kênh để kết nối lại trước khi gửi." };
  }

  const result =
    conversation.kind === "ZALO_OA"
      ? await sendZaloTextMessage(await ensureZaloAccessToken(conversation.channelAccount), conversation.externalUserId, parsed.data.text)
      : await sendFacebookTextMessage(decryptSecret(conversation.channelAccount.accessTokenEnc), conversation.externalUserId, parsed.data.text);

  await recordOutboundMessage({ conversationId: conversation.id, text: parsed.data.text, sentById: user.id, result });

  if (!result.ok) return { error: result.error };
  return { ok: true, nonce: Date.now() };
}

/** Đánh dấu đã đọc — gọi thẳng khi mở trang chi tiết hội thoại. */
export async function markConversationRead(conversationId: string): Promise<void> {
  await requireCap("mod:cham-soc-hop-thu");
  await prisma.conversation.update({ where: { id: conversationId }, data: { unreadCount: 0 } }).catch(() => {});
}

const linkSchema = z.object({ conversationId: z.string().min(1), customerId: z.string().min(1) });

/** Gắn hội thoại với 1 hồ sơ khách hàng có sẵn (tìm theo tên/5 số cuối ngay trên trang chi tiết).
 * Gọi qua <form action> thuần trong Server Component nên tự revalidate (không có router.refresh() client đi kèm). */
export async function linkConversationToCustomer(formData: FormData): Promise<void> {
  const user = await requireUser([...CARE_WRITE_ROLES]);
  const parsed = linkSchema.safeParse({
    conversationId: formData.get("conversationId") ?? "",
    customerId: formData.get("customerId") ?? "",
  });
  if (!parsed.success) return;

  await prisma.$transaction(async (tx) => {
    await tx.conversation.update({ where: { id: parsed.data.conversationId }, data: { customerId: parsed.data.customerId } });
    await auditRequired(tx, user.id, "LINK_CONVERSATION", {
      entity: "Conversation",
      entityId: parsed.data.conversationId,
      meta: { customerId: parsed.data.customerId },
    });
  });
  revalidatePath(`/cham-soc/hop-thu/${parsed.data.conversationId}`);
}

export async function unlinkConversationCustomer(formData: FormData): Promise<void> {
  const user = await requireUser([...CARE_WRITE_ROLES]);
  const id = String(formData.get("conversationId") ?? "");
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    const changed = await tx.conversation.updateMany({ where: { id }, data: { customerId: null } });
    if (changed.count > 0) await auditRequired(tx, user.id, "UNLINK_CONVERSATION", { entity: "Conversation", entityId: id });
  });
  revalidatePath(`/cham-soc/hop-thu/${id}`);
}

// ===== AI soạn tin gợi ý trả lời =====
export type AiDraftState = { ok?: boolean; text?: string; error?: string };

/** Dùng AI soạn sẵn 1 tin trả lời dựa trên vài tin gần nhất — nhân viên xem/sửa rồi mới gửi.
 * LƯU Ý DỮ LIỆU: khác `draftCareMessage` (chỉ gửi tên+dịch vụ), hàm này gửi thêm NỘI DUNG
 * vài tin nhắn gần nhất cho nhà cung cấp AI để trả lời có ngữ cảnh — cân nhắc khi chọn nhà
 * cung cấp AI cho phòng khám (xem lưu ý chủ quyền dữ liệu trong .env.example mục AI). */
export async function draftChannelReply(_prev: AiDraftState, formData: FormData): Promise<AiDraftState> {
  await requireUser([...CARE_WRITE_ROLES]);
  const conversationId = String(formData.get("conversationId") ?? "");
  const note = String(formData.get("note") ?? "").trim();

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      customer: { select: { fullName: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 6, select: { direction: true, text: true } },
    },
  });
  if (!conversation) return { error: "Không tìm thấy hội thoại." };

  const name = conversation.customer?.fullName ?? conversation.displayName ?? "quý khách";
  const transcript = conversation.messages
    .slice()
    .reverse()
    .map((m) => `${m.direction === "IN" ? "Khách" : "Nhân viên"}: ${m.text ?? "[tệp đính kèm]"}`)
    .join("\n");

  const system =
    "Bạn là nhân viên chăm sóc khách hàng của Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc. " +
    "Soạn 1 tin nhắn trả lời khách qua Zalo/Facebook: lịch sự, ấm áp, chuyên nghiệp, chân thành như người thật, ngắn gọn 2–4 câu. " +
    "Không hứa hẹn kết quả y khoa, không phóng đại, không dùng quá nhiều emoji. " +
    "CHỈ trả về nội dung tin nhắn, không thêm tiêu đề hay giải thích.";
  const prompt =
    `Tên khách: ${name}.` +
    (transcript ? `\nHội thoại gần đây:\n${transcript}` : "") +
    (note ? `\nYêu cầu thêm: ${note}.` : "") +
    "\nHãy soạn tin trả lời phù hợp tiếp theo.";

  const r = await generateMessage({ system, prompt, maxTokens: 400 });
  if (!r.ok) return { error: r.error };
  return { ok: true, text: r.text };
}
