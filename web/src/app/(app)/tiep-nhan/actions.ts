"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { encryptPhone, normalizePhone, phoneLast5, hashPhone } from "@/lib/phone";
import { nextCustomerCode, nextCaseCode, isUniqueViolation } from "@/lib/codes";
import { auditRequired } from "@/lib/audit";
import { defaultScreening } from "@/lib/consultation-sheet";
import { collaboratorCanReceiveReferrals } from "@/lib/collaborator-lifecycle";
import type { Prisma } from "@/generated/prisma/client";

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
  collaboratorId: z.string().trim().optional(),
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
    collaboratorId: formData.get("collaboratorId") ?? "",
    address: formData.get("address") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;
  const collaborator = data.source === "COLLABORATOR" && data.collaboratorId
    ? await prisma.collaborator.findFirst({ where: { id: data.collaboratorId }, select: { id: true, name: true, active: true, archivedAt: true } })
    : null;
  if (data.source === "COLLABORATOR" && (!collaborator || !collaboratorCanReceiveReferrals(collaborator))) {
    return { error: "Vui lòng chọn cộng tác viên đang hoạt động; CTV đã đình chỉ/lưu trữ không nhận khách mới." };
  }
  if (data.source === "COLLABORATOR" && !data.collaboratorId) {
    return { error: "Nguồn CTV bắt buộc phải chọn cộng tác viên từ danh sách." };
  }
  const collaboratorAssignedAt = collaborator ? new Date() : null;

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

  // Sinh mã + tạo, thử lại nếu mã bị trùng (đề phòng tạo đồng thời).
  let customer: { id: string; caseId: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await nextCustomerCode();
    const caseCode = await nextCaseCode();
    try {
      customer = await prisma.$transaction(async (tx) => {
        const created = await tx.customer.create({
          data: {
            code,
            fullName: data.fullName,
            gender: data.gender ?? null,
            dob,
            phoneEnc: encryptPhone(normalized),
            phoneLast5: phoneLast5(normalized),
            phoneHash: hashPhone(normalized),
            source: data.source,
            sourceDetail: collaborator?.name ?? (data.sourceDetail || null),
            collaboratorId: collaborator?.id ?? null,
            collaboratorAssignedAt,
            address: data.address || null,
            note: data.note || null,
            createdById: user.id,
          },
        });
        const record = await tx.caseRecord.create({
          data: {
            code: caseCode,
            customerId: created.id,
            status: "OPEN",
            chiefComplaint: null,
            note: "Hồ sơ nháp tự tạo khi tiếp nhận khách mới",
            collaboratorId: collaborator?.id ?? null,
            collaboratorAssignedAt,
            createdById: user.id,
          },
        });
        const consultation = await tx.consultationRecord.create({
          data: {
            caseId: record.id,
            screening: defaultScreening() satisfies Prisma.InputJsonValue,
            serviceSnapshot: { autoCreatedFromCustomer: true } satisfies Prisma.InputJsonValue,
            createdById: user.id,
          },
        });
        await auditRequired(tx, user.id, "CREATE_CUSTOMER", { entity: "Customer", entityId: created.id, meta: { caseId: record.id, consultationId: consultation.id, consultationAutoCreated: true } });
        return { id: created.id, caseId: record.id };
      });
      break;
    } catch (e) {
      if (isUniqueViolation(e) && attempt < 4) continue;
      throw e;
    }
  }
  if (!customer) return { error: "Không tạo được hồ sơ khách. Vui lòng thử lại." };

  revalidatePath("/khach-hang");
  revalidatePath(`/khach-hang/${customer.id}`);
  revalidatePath("/ho-so");
  redirect(`/ho-so/${customer.caseId}`);
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

  // Sinh mã hồ sơ + tạo, thử lại nếu mã bị trùng (mã = số lớn nhất + 1; an toàn cả khi đã xóa hồ sơ).
  let created: { id: string } | null = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = await nextCaseCode();
    try {
      created = await prisma.$transaction(async (tx) => {
        const record = await tx.caseRecord.create({
          data: {
            code,
            customerId,
            status: "OPEN",
            consultantId,
            chiefComplaint: serviceInterest || null,
            createdById: user.id,
          },
        });
        const consultation = await tx.consultationRecord.create({
          data: {
            caseId: record.id,
            screening: defaultScreening() satisfies Prisma.InputJsonValue,
            wants: serviceInterest || null,
            serviceSnapshot: serviceInterest ? { initialInterest: serviceInterest } satisfies Prisma.InputJsonValue : undefined,
            createdById: user.id,
          },
        });
        await auditRequired(tx, user.id, "CREATE_CASE", { entity: "CaseRecord", entityId: record.id, meta: { customerId, consultationId: consultation.id, consultationAutoCreated: true } });
        return { id: record.id };
      });
      break;
    } catch (e) {
      if (isUniqueViolation(e) && attempt < 4) continue;
      throw e;
    }
  }
  if (!created) redirect(`/khach-hang/${customerId}`);

  revalidatePath("/ho-so");
  revalidatePath(`/khach-hang/${customerId}`);
  redirect(`/ho-so/${created.id}`);
}
