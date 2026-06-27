"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { findConflicts, minutesApart, SLOT_WINDOW_MIN, type ApptSlot } from "@/lib/schedule";
import type { AppointmentStatus } from "@/generated/prisma/client";

// `conflict: true` → form hiện cảnh báo trùng lịch + nút "Vẫn đặt" (gửi lại kèm force=1).
export type ApptFormState = { ok?: boolean; error?: string; conflict?: boolean };

// Trạng thái coi là CÒN HIỆU LỰC khi xét trùng lịch (đã hủy / không đến / xong thì bỏ qua).
const ACTIVE_STATUSES: AppointmentStatus[] = ["BOOKED", "CONFIRMED", "ARRIVED", "IN_CONSULT", "IN_SERVICE"];

/**
 * Kiểm tra người phụ trách (consultant) có lịch khác đụng giờ trong cửa sổ không.
 * Trả về câu cảnh báo nếu có trùng (để hiện cho người đặt), hoặc null nếu trống.
 */
async function consultantConflictMessage(
  consultantId: string,
  when: Date,
  excludeId?: string,
): Promise<string | null> {
  const dayStart = new Date(when.getTime() - 12 * 3_600_000);
  const dayEnd = new Date(when.getTime() + 12 * 3_600_000);
  const others = await prisma.appointment.findMany({
    where: {
      consultantId,
      status: { in: ACTIVE_STATUSES },
      scheduledAt: { gte: dayStart, lte: dayEnd },
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true, scheduledAt: true, guestName: true, customer: { select: { fullName: true } } },
    take: 50,
  });
  const slots: ApptSlot[] = others.map((o) => ({
    id: o.id,
    scheduledAt: o.scheduledAt,
    label: o.customer?.fullName || o.guestName || "khách",
  }));
  const hits = findConflicts(when.getTime(), slots, SLOT_WINDOW_MIN, excludeId);
  if (hits.length === 0) return null;
  const nearest = hits[0];
  const fmt = new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
  const apart = minutesApart(when.getTime(), nearest.scheduledAt.getTime());
  return `Trùng lịch: người phụ trách đã có hẹn "${nearest.label}" lúc ${fmt.format(nearest.scheduledAt)} (cách ${apart} phút).${hits.length > 1 ? ` (+${hits.length - 1} lịch khác gần đó)` : ""} Bấm "Vẫn đặt lịch này" nếu vẫn muốn đặt.`;
}

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

// Lõi tạo lịch. `force=true` → bỏ qua kiểm tra trùng lịch (người dùng đã bấm "Vẫn đặt").
// Tách lõi + 2 export (thường / forced) để KHÔNG phải truyền cờ qua FormData — React 19/Next
// lược bỏ field thêm bằng `fd.set()` khi gọi server action, nên dùng 2 action riêng cho chắc.
async function doCreateAppointment(formData: FormData, force: boolean): Promise<ApptFormState> {
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

  // Chống trùng lịch: cùng người phụ trách, đụng giờ trong cửa sổ → cảnh báo (cho ghi đè).
  if (data.consultantId && !force) {
    const msg = await consultantConflictMessage(data.consultantId, when);
    if (msg) return { error: msg, conflict: true };
  }

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

  return { ok: true };
}

export async function createAppointment(_prev: ApptFormState, formData: FormData): Promise<ApptFormState> {
  return doCreateAppointment(formData, false);
}

/** Tạo lịch BỎ QUA cảnh báo trùng (người dùng đã xác nhận "Vẫn đặt lịch này"). */
export async function createAppointmentForced(_prev: ApptFormState, formData: FormData): Promise<ApptFormState> {
  return doCreateAppointment(formData, true);
}

const ALLOWED_EDIT = ["ADMIN", "MANAGER"] as const;

/** Lõi sửa lịch. `force=true` → bỏ qua kiểm tra trùng lịch. */
async function doUpdateAppointment(formData: FormData, force: boolean): Promise<ApptFormState> {
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

  // Chống trùng lịch (bỏ qua chính lịch đang sửa).
  if (data.consultantId && !force) {
    const msg = await consultantConflictMessage(data.consultantId, when, id);
    if (msg) return { error: msg, conflict: true };
  }

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

  return { ok: true };
}

/** Sửa toàn bộ thông tin lịch hẹn (quản trị / quản lý). */
export async function updateAppointment(_prev: ApptFormState, formData: FormData): Promise<ApptFormState> {
  return doUpdateAppointment(formData, false);
}

/** Sửa lịch BỎ QUA cảnh báo trùng (đã xác nhận "Vẫn đặt lịch này"). */
export async function updateAppointmentForced(_prev: ApptFormState, formData: FormData): Promise<ApptFormState> {
  return doUpdateAppointment(formData, true);
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
  revalidatePath("/dau-ca");
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
