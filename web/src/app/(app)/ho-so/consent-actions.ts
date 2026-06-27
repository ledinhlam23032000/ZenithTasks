"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";

export type ConsentState = { ok?: boolean; error?: string; nonce?: number };

const schema = z.object({
  caseId: z.string().min(1),
  templateId: z.string().optional(),
  title: z.string().trim().min(1, "Vui lòng nhập tên phiếu."),
  body: z.string().trim().min(1, "Nội dung phiếu trống."),
  signerName: z.string().trim().min(1, "Vui lòng nhập tên người ký."),
  relationship: z.string().trim().optional(),
  signedAt: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

/** Ghi nhận một phiếu đồng ý đã ký cho hồ sơ (lưu snapshot nội dung). */
export async function addConsent(_prev: ConsentState, formData: FormData): Promise<ConsentState> {
  const user = await requireCap("case.clinical");
  const parsed = schema.safeParse({
    caseId: formData.get("caseId") ?? "",
    templateId: formData.get("templateId") ?? "",
    title: formData.get("title") ?? "",
    body: formData.get("body") ?? "",
    signerName: formData.get("signerName") ?? "",
    relationship: formData.get("relationship") ?? "",
    signedAt: formData.get("signedAt") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  let signedAt = new Date();
  if (d.signedAt) {
    const dt = new Date(d.signedAt);
    if (!Number.isNaN(dt.getTime())) signedAt = dt;
  }

  await prisma.caseConsent.create({
    data: {
      caseId: d.caseId,
      templateId: d.templateId || null,
      title: d.title,
      body: d.body,
      signerName: d.signerName,
      relationship: d.relationship || null,
      signedAt,
      note: d.note || null,
      createdById: user.id,
    },
  });
  return { ok: true, nonce: Date.now() };
}

export async function deleteConsent(formData: FormData): Promise<void> {
  await requireCap("case.clinical");
  const id = String(formData.get("id") ?? "");
  const caseId = String(formData.get("caseId") ?? "");
  if (!id) return;
  await prisma.caseConsent.delete({ where: { id } }).catch(() => {});
  if (caseId) revalidatePath(`/ho-so/${caseId}`);
}
