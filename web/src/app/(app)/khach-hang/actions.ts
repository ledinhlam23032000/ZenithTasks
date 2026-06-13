"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { encryptPhone, normalizePhone, phoneLast5, hashPhone } from "@/lib/phone";

export type EditCustomerState = { ok?: boolean; error?: string };

const ROLES = ["ADMIN", "MANAGER", "RECEPTION", "TELESALE"] as const;

const schema = z.object({
  customerId: z.string().min(1),
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().trim().optional(), // để trống = không đổi
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().trim().optional(),
  source: z.enum(["MARKETING", "COLLABORATOR", "WALK_IN", "REFERRAL", "HOTLINE", "FACEBOOK", "ZALO", "TIKTOK", "OTHER"]),
  sourceDetail: z.string().trim().optional(),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function updateCustomer(_prev: EditCustomerState, formData: FormData): Promise<EditCustomerState> {
  const user = await requireUser([...ROLES]);

  const parsed = schema.safeParse({
    customerId: formData.get("customerId") ?? "",
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    gender: (formData.get("gender") as string) || undefined,
    dob: formData.get("dob") ?? "",
    source: formData.get("source") ?? "OTHER",
    sourceDetail: formData.get("sourceDetail") ?? "",
    address: formData.get("address") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  const existing = await prisma.customer.findUnique({ where: { id: d.customerId }, select: { id: true } });
  if (!existing) return { error: "Không tìm thấy khách hàng." };

  let dob: Date | null | undefined;
  if (d.dob) {
    const parsedDob = new Date(d.dob);
    dob = Number.isNaN(parsedDob.getTime()) ? undefined : parsedDob;
  } else {
    dob = null;
  }

  // Cập nhật số điện thoại nếu có nhập mới
  let phoneFields: { phoneEnc: string; phoneLast5: string; phoneHash: string } | undefined;
  if (d.phone) {
    const normalized = normalizePhone(d.phone);
    if (normalized.length < 9 || normalized.length > 11) {
      return { error: "Số điện thoại không hợp lệ (cần 9–11 chữ số)." };
    }
    const dup = await prisma.customer.findFirst({
      where: { phoneHash: hashPhone(normalized), id: { not: d.customerId } },
      select: { code: true, fullName: true },
    });
    if (dup) return { error: `Số điện thoại đã thuộc về khách khác: ${dup.fullName} (${dup.code}).` };
    phoneFields = {
      phoneEnc: encryptPhone(normalized),
      phoneLast5: phoneLast5(normalized),
      phoneHash: hashPhone(normalized),
    };
  }

  await prisma.customer.update({
    where: { id: d.customerId },
    data: {
      fullName: d.fullName,
      gender: d.gender ?? null,
      dob,
      source: d.source,
      sourceDetail: d.sourceDetail || null,
      address: d.address || null,
      note: d.note || null,
      ...(phoneFields ?? {}),
    },
  });

  await prisma.auditLog
    .create({ data: { actorId: user.id, action: "UPDATE_CUSTOMER", entity: "Customer", entityId: d.customerId } })
    .catch(() => {});

  revalidatePath(`/khach-hang/${d.customerId}`);
  revalidatePath("/khach-hang");
  return { ok: true };
}

/**
 * Xóa vĩnh viễn một khách hàng và toàn bộ dữ liệu liên quan.
 * CHỈ quản trị viên. Xóa con trước, cha sau, trong một giao dịch.
 */
export async function deleteCustomer(formData: FormData): Promise<void> {
  const user = await requireUser(["ADMIN"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.$transaction([
    prisma.payment.deleteMany({ where: { case: { customerId: id } } }),
    prisma.caseService.deleteMany({ where: { case: { customerId: id } } }),
    prisma.materialUsage.deleteMany({ where: { case: { customerId: id } } }),
    prisma.followUp.deleteMany({ where: { customerId: id } }),
    prisma.photo.deleteMany({ where: { customerId: id } }),
    prisma.careMessage.deleteMany({ where: { customerId: id } }),
    prisma.appointment.deleteMany({ where: { customerId: id } }),
    prisma.caseRecord.deleteMany({ where: { customerId: id } }),
    prisma.customer.delete({ where: { id } }),
  ]);

  await prisma.auditLog
    .create({ data: { actorId: user.id, action: "DELETE_CUSTOMER", entity: "Customer", entityId: id } })
    .catch(() => {});

  revalidatePath("/khach-hang");
  redirect("/khach-hang");
}
