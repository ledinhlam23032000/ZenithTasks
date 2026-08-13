"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { auditRequired } from "@/lib/audit";
import { encryptPhone, normalizePhone, phoneLast5, hashPhone } from "@/lib/phone";
import { nextCustomerCode, isUniqueViolation } from "@/lib/codes";

export type LeadFormState = { ok?: boolean; error?: string; nonce?: number };

const LEAD_ROLES = ["ADMIN", "MANAGER", "TELESALE", "RECEPTION"] as const;

const SOURCES = ["MARKETING", "COLLABORATOR", "WALK_IN", "REFERRAL", "HOTLINE", "FACEBOOK", "ZALO", "TIKTOK", "OTHER"] as const;

const baseSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập tên khách."),
  phone: z.string().trim().optional(),
  source: z.enum(SOURCES),
  sourceDetail: z.string().trim().optional(),
  serviceInterest: z.string().trim().optional(),
  note: z.string().trim().optional(),
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "LOST"]).optional(),
});

/** Mã hoá SĐT nếu có; trả về 3 trường lưu kho hoặc null khi bỏ trống. */
function phoneFields(raw?: string): { phoneEnc: string | null; phoneLast5: string | null; phoneHash: string | null } | { error: string } {
  if (!raw || !raw.trim()) return { phoneEnc: null, phoneLast5: null, phoneHash: null };
  const normalized = normalizePhone(raw);
  if (normalized.length < 9 || normalized.length > 11) return { error: "Số điện thoại không hợp lệ (cần 9–11 chữ số)." };
  return { phoneEnc: encryptPhone(normalized), phoneLast5: phoneLast5(normalized), phoneHash: hashPhone(normalized) };
}

/** Thêm khách tham khảo (lead). Cặp với useFormAction → không revalidate. */
export async function createLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const user = await requireUser([...LEAD_ROLES]);
  const parsed = baseSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    source: formData.get("source") ?? "OTHER",
    sourceDetail: formData.get("sourceDetail") ?? "",
    serviceInterest: formData.get("serviceInterest") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  const pf = phoneFields(d.phone);
  if ("error" in pf) return { error: pf.error };

  await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({
      data: {
        fullName: d.fullName,
        ...pf,
        source: d.source,
        sourceDetail: d.sourceDetail || null,
        serviceInterest: d.serviceInterest || null,
        note: d.note || null,
        createdById: user.id,
      },
    });
    await auditRequired(tx, user.id, "CREATE_LEAD", { entity: "Lead", entityId: lead.id });
  });
  return { ok: true, nonce: Date.now() };
}

const editSchema = baseSchema.extend({ id: z.string().min(1) });

/** Sửa thông tin khách tham khảo. Cặp với useFormAction → không revalidate. */
export async function updateLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const user = await requireUser([...LEAD_ROLES]);
  const parsed = editSchema.safeParse({
    id: formData.get("id") ?? "",
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    source: formData.get("source") ?? "OTHER",
    sourceDetail: formData.get("sourceDetail") ?? "",
    serviceInterest: formData.get("serviceInterest") ?? "",
    note: formData.get("note") ?? "",
    status: formData.get("status") ?? "NEW",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  const pf = phoneFields(d.phone);
  if ("error" in pf) return { error: pf.error };

  await prisma.$transaction(async (tx) => {
    await tx.lead.update({
      where: { id: d.id },
      data: {
        fullName: d.fullName,
        ...pf,
        source: d.source,
        sourceDetail: d.sourceDetail || null,
        serviceInterest: d.serviceInterest || null,
        note: d.note || null,
        status: d.status ?? "NEW",
      },
    });
    await auditRequired(tx, user.id, "UPDATE_LEAD", { entity: "Lead", entityId: d.id });
  });
  return { ok: true, nonce: Date.now() };
}

/** Đổi nhanh trạng thái (dùng nút trên danh sách). */
export async function setLeadStatus(formData: FormData): Promise<void> {
  const user = await requireUser([...LEAD_ROLES]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!id || !["NEW", "CONTACTED", "CONVERTED", "LOST"].includes(status)) return;
  await prisma.$transaction(async (tx) => {
    const changed = await tx.lead.updateMany({ where: { id }, data: { status: status as "NEW" | "CONTACTED" | "CONVERTED" | "LOST" } });
    if (changed.count > 0) await auditRequired(tx, user.id, "SET_LEAD_STATUS", { entity: "Lead", entityId: id, meta: { status } });
  });
  // KHÔNG gọi revalidatePath: gọi trực tiếp từ client qua useTransition + router.refresh()
  // (xem LeadStatusSelect), không phải qua <form action> thuần — mục 8.1 BAN-GIAO.md.
}

/** Xoá khách tham khảo (dùng với ConfirmButton). */
export async function deleteLead(formData: FormData): Promise<void> {
  const user = await requireUser([...LEAD_ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.$transaction(async (tx) => {
    const deleted = await tx.lead.deleteMany({ where: { id } });
    if (deleted.count > 0) await auditRequired(tx, user.id, "DELETE_LEAD", { entity: "Lead", entityId: id });
  });
  revalidatePath("/khach-tham-khao");
}

/**
 * Chuyển khách tham khảo → KHÁCH HÀNG thật (đã đến / đồng ý). Copy SĐT đã mã hoá
 * sang Customer (không cần giải mã), chống trùng theo phoneHash, đánh dấu lead CONVERTED.
 */
export async function convertLeadToCustomer(formData: FormData): Promise<void> {
  const user = await requireUser([...LEAD_ROLES]);
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/khach-tham-khao");

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) redirect("/khach-tham-khao");
  if (!lead.phoneEnc || !lead.phoneHash || !lead.phoneLast5) {
    redirect("/khach-tham-khao?err=nophone");
  }

  // Đã có khách trùng SĐT? → gắn CONVERTED rồi mở hồ sơ khách đó.
  const dup = await prisma.customer.findFirst({ where: { phoneHash: lead.phoneHash }, select: { id: true } });
  if (dup) {
    await prisma.$transaction(async (tx) => {
      await tx.lead.update({ where: { id }, data: { status: "CONVERTED" } });
      await auditRequired(tx, user.id, "CONVERT_LEAD", { entity: "Lead", entityId: id, meta: { customerId: dup.id, dup: true } });
    });
    redirect(`/khach-hang/${dup.id}`);
  }

  let customer: { id: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await nextCustomerCode();
    try {
      customer = await prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
        data: {
          code,
          fullName: lead.fullName,
          phoneEnc: lead.phoneEnc!,
          phoneLast5: lead.phoneLast5!,
          phoneHash: lead.phoneHash!,
          source: lead.source,
          sourceDetail: lead.sourceDetail,
          note: lead.serviceInterest ? `Quan tâm: ${lead.serviceInterest}${lead.note ? `. ${lead.note}` : ""}` : lead.note,
          createdById: user.id,
        },
        });
        await tx.lead.update({ where: { id }, data: { status: "CONVERTED" } });
        await auditRequired(tx, user.id, "CONVERT_LEAD", { entity: "Lead", entityId: id, meta: { customerId: created.id } });
        return { id: created.id };
      });
      break;
    } catch (e) {
      if (isUniqueViolation(e) && attempt < 4) continue;
      throw e;
    }
  }
  if (!customer) redirect("/khach-tham-khao?err=create");

  revalidatePath("/khach-tham-khao");
  revalidatePath("/khach-hang");
  redirect(`/khach-hang/${customer.id}`);
}
