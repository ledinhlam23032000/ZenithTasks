"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhone, phoneLast5, encryptPhone, redactPhoneLikeText } from "@/lib/phone";
import { auditRequired } from "@/lib/audit";
import { bump } from "@/lib/rate-limit";
import { BOOKING_HOUR_MIN, BOOKING_HOUR_MAX, BOOKING_MIN_MINUTES, BOOKING_MAX_MINUTES } from "@/lib/booking-hours";
import { clientIpFromHeaders } from "@/lib/request-client";

export type BookingState = { ok?: boolean; error?: string; reference?: string; requestedAt?: string };

const schema = z.object({
  guestName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại."),
  scheduledAt: z.string().min(1, "Vui lòng chọn ngày giờ mong muốn."),
  serviceInterest: z.string().trim().optional(),
  note: z.string().trim().optional(),
  clientNonce: z.string().min(16).max(128),
});

export async function createPublicAppointment(_prev: BookingState, formData: FormData): Promise<BookingState> {
  // Honeypot: bot thường tự điền ô ẩn này -> coi như thành công nhưng bỏ qua.
  if (String(formData.get("company") ?? "").trim() !== "") return { ok: true };

  const h = await headers();
  const ip = clientIpFromHeaders(h);
  if (await bump(`book:${ip}`, 5)) return { error: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút." };

  const parsed = schema.safeParse({
    guestName: formData.get("guestName") ?? "",
    phone: formData.get("phone") ?? "",
    scheduledAt: formData.get("scheduledAt") ?? "",
    serviceInterest: formData.get("serviceInterest") ?? "",
    note: formData.get("note") ?? "",
    clientNonce: formData.get("clientNonce") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  const norm = normalizePhone(d.phone);
  if (norm.length < 9 || norm.length > 11) return { error: "Số điện thoại không hợp lệ (9–11 chữ số)." };
  const when = new Date(d.scheduledAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày giờ không hợp lệ." };
  if (when.getTime() < Date.now() - 60_000) return { error: "Vui lòng chọn thời gian trong tương lai." };
  const minutesOfDay = when.getHours() * 60 + when.getMinutes();
  if (minutesOfDay < BOOKING_MIN_MINUTES || minutesOfDay > BOOKING_MAX_MINUTES) {
    return { error: `Trung tâm chỉ nhận lịch hẹn trong khung giờ ${BOOKING_HOUR_MIN}–${BOOKING_HOUR_MAX}. Vui lòng chọn giờ khác.` };
  }

  const previous = await prisma.appointment.findUnique({ where: { publicNonce: d.clientNonce }, select: { id: true, scheduledAt: true } });
  if (previous) {
    return {
      ok: true,
      reference: `LH-${previous.id.slice(-8).toUpperCase()}`,
      requestedAt: new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeStyle: "short" }).format(previous.scheduledAt),
    };
  }

  let appointment;
  try {
    appointment = await prisma.$transaction(async (tx) => {
      const created = await tx.appointment.create({
      data: {
        publicNonce: d.clientNonce,
        guestName: d.guestName,
        // SĐT đầy đủ MÃ HOÁ (như Customer) — trước đây nhét thẳng chữ thường vào "note",
        // trái quy ước bảo mật SĐT toàn hệ thống. Lễ tân xem qua nút "Xem số" (có quyền
        // phone.full + ghi nhật ký REVEAL_PHONE), không còn lộ ra ghi chú thô.
        phoneEnc: encryptPhone(norm),
        phoneLast5: phoneLast5(norm),
        scheduledAt: when,
        type: "NEW",
        source: "OTHER",
        sourceDetail: "Đặt lịch online",
        serviceInterest: d.serviceInterest || null,
        note: redactPhoneLikeText(d.note) || null,
      },
      });
      await auditRequired(tx, null, "PUBLIC_BOOKING", {
        entity: "Appointment",
        entityId: created.id,
        meta: { reference: `LH-${created.id.slice(-8).toUpperCase()}`, scheduledAt: created.scheduledAt.toISOString() },
      });
      return created;
    });
  } catch {
    // Two browser tabs may submit the same nonce concurrently. The unique
    // constraint is the final arbiter; return the already-created request
    // instead of creating a duplicate or showing a false failure.
    const raced = await prisma.appointment.findUnique({
      where: { publicNonce: d.clientNonce },
      select: { id: true, scheduledAt: true },
    });
    if (!raced) return { error: "Không thể ghi nhận yêu cầu lúc này. Vui lòng thử lại." };
    return {
      ok: true,
      reference: `LH-${raced.id.slice(-8).toUpperCase()}`,
      requestedAt: new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeStyle: "short" }).format(raced.scheduledAt),
    };
  }

  revalidatePath("/lich-hen");
  revalidatePath("/dashboard");
  return {
    ok: true,
    reference: `LH-${appointment.id.slice(-8).toUpperCase()}`,
    requestedAt: new Intl.DateTimeFormat("vi-VN", { dateStyle: "full", timeStyle: "short" }).format(appointment.scheduledAt),
  };
}
