"use server";

import { revalidatePath } from "next/cache";
import { requireCap } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { prisma } from "@/lib/db";

export async function saveResponseTarget(formData: FormData): Promise<void> {
  await requireCap("inbox.manageChannels");
  const id = String(formData.get("id") ?? "");
  const raw = String(formData.get("responseTargetMinutes") ?? "").trim();
  const responseTargetMinutes = raw === "" ? null : Number(raw);
  if (!id || (responseTargetMinutes !== null && (!Number.isInteger(responseTargetMinutes) || responseTargetMinutes <= 0 || responseTargetMinutes > 10080))) {
    throw new Error("Thời gian phản hồi phải là số phút từ 1 đến 10080, hoặc để trống để tắt.");
  }
  await prisma.channelAccount.update({ where: { id }, data: { responseTargetMinutes } });
  revalidatePath("/cham-soc/cai-dat");
}

export async function disconnectChannel(formData: FormData): Promise<void> {
  const user = await requireCap("inbox.manageChannels");
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("Thiếu mã kênh.");
  const account = await prisma.channelAccount.update({
    where: { id },
    data: { status: "DISCONNECTED", accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null, disconnectedAt: new Date() },
    select: { id: true, provider: true, externalAccountId: true },
  });
  await audit(user.id, "CHANNEL_DISCONNECT", { entity: "ChannelAccount", entityId: account.id, meta: { provider: account.provider, externalAccountId: account.externalAccountId } });
  revalidatePath("/cham-soc/cai-dat");
}
