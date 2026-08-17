"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { agreementTitle, buildAgreementTemplate, type AgreementTemplateType } from "@/lib/agreement-templates";

export type AgreementState = { ok?: boolean; error?: string };
const agreementType = z.enum(["CONFIDENTIALITY", "NON_COMPETE"]);

export async function createStaffAgreement(_prev: AgreementState, formData: FormData): Promise<AgreementState> {
  const user = await requireUser(["ADMIN"]);
  const userId = String(formData.get("userId") ?? "");
  const typeParsed = agreementType.safeParse(String(formData.get("type") ?? ""));
  if (!userId || !typeParsed.success) return { error: "Thiếu nhân sự hoặc loại thỏa thuận." };
  const staff = await prisma.user.findUnique({ where: { id: userId }, select: { fullName: true, nationalId: true, position: true } });
  if (!staff) return { error: "Không tìm thấy nhân sự." };
  const last = await prisma.staffAgreement.findFirst({ where: { userId, type: typeParsed.data }, orderBy: { version: "desc" }, select: { version: true } });
  const version = (last?.version ?? 0) + 1;
  await prisma.$transaction(async (tx) => {
    const created = await tx.staffAgreement.create({ data: { userId, type: typeParsed.data, title: agreementTitle(typeParsed.data as AgreementTemplateType), version, contentSnapshot: buildAgreementTemplate(typeParsed.data as AgreementTemplateType, staff), createdById: user.id } });
    await auditRequired(tx, user.id, "CREATE_STAFF_AGREEMENT", { entity: "StaffAgreement", entityId: created.id, meta: { userId, type: typeParsed.data, version } });
  });
  return { ok: true };
}

export async function signStaffAgreement(_prev: AgreementState, formData: FormData): Promise<AgreementState> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã thỏa thuận." };
  const effectiveFrom = new Date(String(formData.get("effectiveFrom") ?? ""));
  const effectiveUntilRaw = String(formData.get("effectiveUntil") ?? "");
  const effectiveUntil = effectiveUntilRaw ? new Date(effectiveUntilRaw) : null;
  if (Number.isNaN(effectiveFrom.getTime())) return { error: "Ngày hiệu lực không hợp lệ." };
  if (effectiveUntil && Number.isNaN(effectiveUntil.getTime())) return { error: "Ngày hết hạn không hợp lệ." };
  const item = await prisma.staffAgreement.findUnique({ where: { id } });
  if (!item || item.status !== "DRAFT") return { error: "Chỉ bản nháp mới được ký." };
  await prisma.$transaction(async (tx) => {
    await tx.staffAgreement.update({ where: { id }, data: { status: "SIGNED", signedAt: new Date(), effectiveFrom, effectiveUntil } });
    await auditRequired(tx, user.id, "SIGN_STAFF_AGREEMENT", { entity: "StaffAgreement", entityId: id, meta: { type: item.type, version: item.version } });
  });
  return { ok: true };
}

export async function revokeStaffAgreement(_prev: AgreementState, formData: FormData): Promise<AgreementState> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã thỏa thuận." };
  const item = await prisma.staffAgreement.findUnique({ where: { id } });
  if (!item || item.status === "REVOKED") return { error: "Thỏa thuận không tồn tại hoặc đã thu hồi." };
  await prisma.$transaction(async (tx) => {
    await tx.staffAgreement.update({ where: { id }, data: { status: "REVOKED" } });
    await auditRequired(tx, user.id, "REVOKE_STAFF_AGREEMENT", { entity: "StaffAgreement", entityId: id, meta: { type: item.type, version: item.version } });
  });
  return { ok: true };
}
