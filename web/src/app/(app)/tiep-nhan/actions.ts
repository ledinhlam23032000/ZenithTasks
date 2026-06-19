"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { encryptPhone, normalizePhone, phoneLast5, hashPhone } from "@/lib/phone";
import { nextCustomerCode, nextCaseCode } from "@/lib/codes";

export type CustomerFormState = { ok?: boolean; error?: string };

const RECEPTION_ROLES = ["ADMIN", "RECEPTION", "TELESALE"] as const;

const customerSchema = z.object({
  fullName: z.string().trim().min(1, "Vui lòng nhập họ tên khách."),
  phone: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập số điện thoại."),
  gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
  dob: z.string().trim().optional(),
  source: z.enum(["MARKETING", "COLLABORATOR", "WALK_IN", "REFERRAL", "HOTLINE", "FACEBOOK", "ZALO", "TIKTOK", "OTHER"]),
  sourceDetail: z.string().trim().optional(),
  address: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function createCustomer(_prev: CustomerFormState, formData: FormData): Promise<CustomerFormState> {
  const user = await requireUser([...RECEPTION_ROLES]);

  const parsed = customerSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    gender: (formData.get("gender") as string) || undefined,
    dob: formData.get("dob") ?? "",
    source: formData.get("source") ?? "WALK_IN",
    sourceDetail: formData.get("sourceDetail") ?? "",
    address: formData.get("address") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  const normalized = normalizePhone(data.phone);
  if (normalized.length < 9 || normalized.length > 11) {
    return { error: "Số điện thoại không hợp lệ (cần 9–11 chữ số)." };
  }

  // Chống trùng hồ sơ theo số điện thoại
  const dup = await prisma.customer.findFirst({
    where: { phoneHash: hashPhone(normalized) },
    select: { id: true, code: true, fullName: true },
  });
  if (dup) {
    return { error: `Khách đã có hồ sơ: ${dup.fullName} (${dup.code}). Hãy tra cứu theo 5 số cuối.` };
  }

  let dob: Date | null = null;
  if (data.dob) {
    const d = new Date(data.dob);
    if (!Number.isNaN(d.getTime())) dob = d;
  }

  const code = await nextCustomerCode();
  const customer = await prisma.customer.create({
    data: {
      code,
      fullName: data.fullName,
      gender: data.gender ?? null,
      dob,
      phoneEnc: encryptPhone(normalized),
      phoneLast5: phoneLast5(normalized),
      phoneHash: hashPhone(normalized),
      source: data.source,
      sourceDetail: data.sourceDetail || null,
      address: data.address || null,
      note: data.note || null,
      createdById: user.id,
    },
  });

  await prisma.auditLog
    .create({ data: { actorId: user.id, action: "CREATE_CUSTOMER", entity: "Customer", entityId: customer.id } })
    .catch(() => {});

  revalidatePath("/khach-hang");
  redirect(`/khach-hang/${customer.id}`);
}

/**
 * Tiếp nhận khách: mở hồ sơ điều trị (OPEN) và chuyển giao cho bộ phận tư vấn/bác sĩ.
 */
export async function receiveCustomer(formData: FormData): Promise<void> {
  const user = await requireUser([...RECEPTION_ROLES, "CONSULTANT", "DOCTOR", "MANAGER"]);
  const customerId = String(formData.get("customerId") ?? "");
  if (!customerId) redirect("/tiep-nhan");

  const customer = await prisma.customer.findUnique({ where: { id: customerId }, select: { id: true } });
  if (!customer) redirect("/tiep-nhan");

  const serviceInterest = String(formData.get("serviceInterest") ?? "").trim();
  const consultantId = String(formData.get("consultantId") ?? "").trim() || null;

  const code = await nextCaseCode();
  const created = await prisma.caseRecord.create({
    data: {
      code,
      customerId,
      status: "OPEN",
      consultantId,
      chiefComplaint: serviceInterest || null,
      createdById: user.id,
    },
  });

  revalidatePath("/ho-so");
  revalidatePath(`/khach-hang/${customerId}`);
  redirect(`/ho-so/${created.id}`);
}
