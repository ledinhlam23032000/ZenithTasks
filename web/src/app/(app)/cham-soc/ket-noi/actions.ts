"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { encryptSecret, decryptSecret } from "@/lib/secret-crypto";
import { getPageInfo, exchangeLongLivedToken } from "@/lib/channels/facebook";
import { getOaInfo } from "@/lib/channels/zalo";

export type ConnectState = { ok?: boolean; error?: string; nonce?: number };

const fbSchema = z.object({
  pageAccessToken: z.string().trim().min(1, "Vui lòng dán Page Access Token."),
});

/** Kết nối Facebook Page bằng token dán tay (Meta Business Suite / System User — xem hướng dẫn trên trang). */
export async function connectFacebookPage(_prev: ConnectState, formData: FormData): Promise<ConnectState> {
  const user = await requireCap("mod:ket-noi-kenh");
  const parsed = fbSchema.safeParse({ pageAccessToken: formData.get("pageAccessToken") ?? "" });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };

  const info = await getPageInfo(parsed.data.pageAccessToken);
  if (!info.ok) return { error: info.error };

  await prisma.$transaction(async (tx) => {
    const account = await tx.channelAccount.upsert({
      where: { kind_externalId: { kind: "FACEBOOK", externalId: info.id } },
      create: {
        kind: "FACEBOOK",
        label: info.name,
        externalId: info.id,
        externalName: info.name,
        accessTokenEnc: encryptSecret(parsed.data.pageAccessToken),
        active: true,
        connectedById: user.id,
      },
      update: {
        label: info.name,
        externalName: info.name,
        accessTokenEnc: encryptSecret(parsed.data.pageAccessToken),
        active: true,
        connectedById: user.id,
      },
    });
    await auditRequired(tx, user.id, "CONNECT_CHANNEL", { entity: "ChannelAccount", entityId: account.id, meta: { kind: "FACEBOOK", label: info.name } });
  });
  return { ok: true, nonce: Date.now() };
}

/** Đổi Page Access Token đang lưu sang bản dài hạn (~60 ngày) — cần FB_APP_ID/FB_APP_SECRET trên máy chủ. */
export async function extendFacebookToken(formData: FormData): Promise<void> {
  const user = await requireCap("mod:ket-noi-kenh");
  const id = String(formData.get("id") ?? "");
  const account = await prisma.channelAccount.findUnique({ where: { id } });
  if (!account || account.kind !== "FACEBOOK") return;

  const result = await exchangeLongLivedToken(decryptSecret(account.accessTokenEnc));
  if (!result.ok) return;

  await prisma.$transaction(async (tx) => {
    await tx.channelAccount.update({
      where: { id },
      data: {
        accessTokenEnc: encryptSecret(result.accessToken),
        tokenExpiresAt: result.expiresInSec ? new Date(Date.now() + result.expiresInSec * 1000) : null,
      },
    });
    await auditRequired(tx, user.id, "EXTEND_CHANNEL_TOKEN", { entity: "ChannelAccount", entityId: id });
  });
}

/** Ngắt kết nối (KHÔNG xoá lịch sử hội thoại — chỉ ngừng nhận/gửi tin mới). */
export async function disconnectChannelAccount(formData: FormData): Promise<void> {
  const user = await requireCap("mod:ket-noi-kenh");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    const account = await tx.channelAccount.update({ where: { id }, data: { active: false } });
    await auditRequired(tx, user.id, "DISCONNECT_CHANNEL", { entity: "ChannelAccount", entityId: id, meta: { kind: account.kind, label: account.label } });
  });
}

export async function reconnectChannelAccount(formData: FormData): Promise<void> {
  const user = await requireCap("mod:ket-noi-kenh");
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    await tx.channelAccount.update({ where: { id }, data: { active: true } });
    await auditRequired(tx, user.id, "RECONNECT_CHANNEL", { entity: "ChannelAccount", entityId: id });
  });
}

export type TestState = { ok?: boolean; error?: string; label?: string };

/** Kiểm tra kết nối còn sống bằng chính token đang lưu (không cần chờ có tin nhắn thật). */
export async function testChannelConnection(_prev: TestState, formData: FormData): Promise<TestState> {
  await requireCap("mod:ket-noi-kenh");
  const id = String(formData.get("id") ?? "");
  const account = await prisma.channelAccount.findUnique({ where: { id } });
  if (!account) return { error: "Không tìm thấy kết nối." };

  const token = decryptSecret(account.accessTokenEnc);
  const info = account.kind === "ZALO_OA" ? await getOaInfo(token) : await getPageInfo(token);
  return info.ok ? { ok: true, label: info.name } : { error: info.error };
}
