"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import type { AppointmentStatus } from "@/generated/prisma/client";

export type ApptFormState = { ok?: boolean; error?: string };

const ALLOWED_CREATE = ["ADMIN", "MANAGER", "TELESALE", "RECEPTION"] as const;

const schema = z.object({
  guestName: z.string().trim().min(1, "Vui lòng nhập tên khách."),
  phoneLast5: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || /^\d{5}$/.test(v), "5 số cuối phải gồm đúng 5 chữ số."),
  scheduledAt: z.string().min(1, "Vui lòng chọn ngày giờ hẹn."),
  type: z.enum(["NEW", "FOLLOW_UP", "RE_SERVICE"]),
  serviceInterest: z.string().trim().optional(),
  source: z.enum(["MARKETING", "COLLABORATOR", "WALK_IN", "REFERRAL", "HOTLINE", "FACEBOOK", "ZALO", "TIKTOK", "OTHER"]),
  sourceDetail: z.string().trim().optional(),
  consultantId: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function createAppointment(_prev: ApptFormState, formData: FormData): Promise<ApptFormState> {
  const user = await requireUser([...ALLOWED_CREATE]);

  const parsed = schema.safeParse({
    guestName: formData.get("guestName") ?? "",
    phoneLast5: formData.get("phoneLast5") ?? "",
    scheduledAt: formData.get("scheduledAt") ?? "",
    type: formData.get("type") ?? "NEW",
    serviceInterest: formData.get("serviceInterest") ?? "",
    source: formData.get("source") ?? "OTHER",
    sourceDetail: formData.get("sourceDetail") ?? "",
    consultantId: formData.get("consultantId") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  const when = new Date(data.scheduledAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày giờ hẹn không hợp lệ." };

  // Nếu nhập 5 số cuối và khớp duy nhất một khách → liên kết hồ sơ luôn
  let customerId: string | undefined;
  if (data.phoneLast5) {
    const matches = await prisma.customer.findMany({
      where: { phoneLast5: data.phoneLast5 },
      select: { id: true },
      take: 2,
    });
    if (matches.length === 1) customerId = matches[0].id;
  }

  await prisma.appointment.create({
    data: {
      customerId,
      guestName: data.guestName,
      phoneLast5: data.phoneLast5 || null,
      scheduledAt: when,
      type: data.type,
      serviceInterest: data.serviceInterest || null,
      source: data.source,
      sourceDetail: data.sourceDetail || null,
      consultantId: data.consultantId || null,
      note: data.note || null,
      createdById: user.id,
    },
  });

  revalidatePath("/lich-hen");
  revalidatePath("/dashboard");
  return { ok: true };
}

const ALLOWED_EDIT = ["ADMIN", "MANAGER"] as const;

/** Sửa toàn bộ thông tin lịch hẹn (quản trị / quản lý). */
export async function updateAppointment(_prev: ApptFormState, formData: FormData): Promise<ApptFormState> {
  await requireUser([...ALLOWED_EDIT]);

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Thiếu mã lịch hẹn." };

  const parsed = schema.safeParse({
    guestName: formData.get("guestName") ?? "",
    phoneLast5: formData.get("phoneLast5") ?? "",
    scheduledAt: formData.get("scheduledAt") ?? "",
    type: formData.get("type") ?? "NEW",
    serviceInterest: formData.get("serviceInterest") ?? "",
    source: formData.get("source") ?? "OTHER",
    sourceDetail: formData.get("sourceDetail") ?? "",
    consultantId: formData.get("consultantId") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  }
  const data = parsed.data;

  const when = new Date(data.scheduledAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày giờ hẹn không hợp lệ." };

  // Nếu 5 số cuối khớp duy nhất một khách → liên kết lại hồ sơ (không tự gỡ liên kết cũ).
  let customerId: string | undefined;
  if (data.phoneLast5) {
    const matches = await prisma.customer.findMany({
      where: { phoneLast5: data.phoneLast5 },
      select: { id: true },
      take: 2,
    });
    if (matches.length === 1) customerId = matches[0].id;
  }

  await prisma.appointment.update({
    where: { id },
    data: {
      guestName: data.guestName,
      phoneLast5: data.phoneLast5 || null,
      scheduledAt: when,
      type: data.type,
      serviceInterest: data.serviceInterest || null,
      source: data.source,
      sourceDetail: data.sourceDetail || null,
      consultantId: data.consultantId || null,
      note: data.note || null,
      ...(customerId ? { customerId } : {}),
    },
  });

  revalidatePath("/lich-hen");
  revalidatePath("/dashboard");
  return { ok: true };
}

const STATUS_VALUES: AppointmentStatus[] = [
  "BOOKED",
  "CONFIRMED",
  "ARRIVED",
  "IN_CONSULT",
  "IN_SERVICE",
  "DONE",
  "CANCELLED",
  "NO_SHOW",
];

export async function updateAppointmentStatus(formData: FormData): Promise<void> {
  // Chỉ các vai trò có quyền với lịch hẹn mới được đổi trạng thái (tránh người
  // dùng vai trò khác đổi trạng thái lịch của bất kỳ ai qua ID).
  await requireUser(["ADMIN", "MANAGER", "TELESALE", "RECEPTION", "CONSULTANT", "NURSE"]);
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as AppointmentStatus;
  if (!id || !STATUS_VALUES.includes(status)) return;

  await prisma.appointment.update({
    where: { id },
    data: {
      status,
      arrivedAt: status === "ARRIVED" ? new Date() : undefined,
    },
  });
  revalidatePath("/lich-hen");
  revalidatePath("/dashboard");
}

/** Xóa lịch hẹn (quản trị / quản lý). Lịch thường thì nên đổi trạng thái "Hủy". */
export async function deleteAppointment(formData: FormData): Promise<void> {
  await requireUser(["ADMIN", "MANAGER"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await prisma.appointment.delete({ where: { id } }).catch(() => {});
  revalidatePath("/lich-hen");
  revalidatePath("/dashboard");
}
