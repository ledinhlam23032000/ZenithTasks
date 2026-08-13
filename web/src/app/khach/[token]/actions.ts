"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { auditRequired } from "@/lib/audit";
import { bump } from "@/lib/rate-limit";
import { clampScore, NPS_MIN, NPS_MAX } from "@/lib/nps";

// ============================================================================
// CỔNG KHÁCH NÂNG CAO (D3) — server action CÔNG KHAI (không đăng nhập), chỉ mở khoá
// bằng portalToken. Mọi thao tác đều kiểm: token → khách → lịch hẹn thuộc đúng khách đó.
// Có chống spam (rate-limit theo token). KHÔNG tự đổi giờ (tránh trùng lịch) — chỉ GHI
// NHẬN yêu cầu để nhân viên xử lý.
// ============================================================================

export type PortalState = { ok?: boolean; error?: string; nonce?: number };

async function customerByToken(token: string): Promise<{ id: string } | null> {
  if (!token || token.length < 10) return null;
  const c = await prisma.customer.findUnique({
    where: { portalToken: token },
    select: { id: true, portalTokenExpiresAt: true },
  });
  if (!c) return null;
  if (c.portalTokenExpiresAt && c.portalTokenExpiresAt.getTime() < Date.now()) return null; // link đã hết hạn
  return { id: c.id };
}

/** Khách tự XÁC NHẬN sẽ đến lịch hẹn. */
export async function portalConfirmAppointment(token: string, appointmentId: string): Promise<PortalState> {
  const cust = await customerByToken(token);
  if (!cust) return { error: "Liên kết không hợp lệ." };
  if (await bump(`portal-confirm:${token}`, 40)) return { error: "Bạn thao tác hơi nhiều, vui lòng thử lại sau ít phút." };

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, customerId: cust.id, status: { in: ["BOOKED", "CONFIRMED"] } },
    select: { id: true },
  });
  if (!appt) return { error: "Không tìm thấy lịch hẹn." };

  await prisma.$transaction(async (tx) => {
    await tx.appointment.update({ where: { id: appt.id }, data: { status: "CONFIRMED" } });
    await auditRequired(tx, null, "PORTAL_CONFIRM_APPOINTMENT", { entity: "Appointment", entityId: appt.id, meta: { customerId: cust.id } });
  });
  revalidatePath(`/khach/${token}`);
  return { ok: true, nonce: Date.now() };
}

/** Khách gửi ĐÁNH GIÁ trải nghiệm (NPS 0–10) + góp ý. */
export async function portalSubmitNps(token: string, score: number, comment: string): Promise<PortalState> {
  const cust = await customerByToken(token);
  if (!cust) return { error: "Liên kết không hợp lệ hoặc đã hết hạn." };
  if (await bump(`portal-nps:${token}`, 6)) return { error: "Bạn đã gửi đánh giá, cảm ơn Quý khách!" };

  const s = clampScore(Number(score));
  if (s < NPS_MIN || s > NPS_MAX) return { error: "Điểm đánh giá không hợp lệ." };

  await prisma.$transaction(async (tx) => {
    const recent = await tx.npsResponse.count({ where: { customerId: cust.id, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } } });
    if (recent > 0) return;
    const response = await tx.npsResponse.create({
    data: { customerId: cust.id, score: s, comment: (comment || "").trim().slice(0, 500) || null },
    });
    await auditRequired(tx, null, "PORTAL_SUBMIT_NPS", { entity: "NpsResponse", entityId: response.id, meta: { customerId: cust.id, score: s } });
  });
  revalidatePath(`/khach/${token}`);
  return { ok: true, nonce: Date.now() };
}

/** Khách ĐỀ NGHỊ đổi lịch — ghi nhận để nhân viên gọi lại sắp xếp (không tự đổi giờ). */
export async function portalRequestReschedule(token: string, appointmentId: string, message: string): Promise<PortalState> {
  const cust = await customerByToken(token);
  if (!cust) return { error: "Liên kết không hợp lệ." };
  if (await bump(`portal-resched:${token}`, 12)) return { error: "Bạn đã gửi yêu cầu nhiều lần, vui lòng chờ phòng khám liên hệ lại." };

  const appt = await prisma.appointment.findFirst({
    where: { id: appointmentId, customerId: cust.id, status: { in: ["BOOKED", "CONFIRMED"] } },
    select: { id: true, scheduledAt: true, note: true },
  });
  if (!appt) return { error: "Không tìm thấy lịch hẹn." };

  const msg = (message || "").trim().slice(0, 400);
  const whenLabel = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" }).format(appt.scheduledAt);

  // Ghi lịch sử chăm sóc, cập nhật lịch hẹn và audit trong cùng transaction.
  const newNote = [appt.note, `Khách đề nghị đổi lịch: ${msg || "(không ghi chú)"}`].filter(Boolean).join(" | ").slice(0, 300);
  await prisma.$transaction(async (tx) => {
    await tx.careMessage.create({
      data: {
        customerId: cust.id,
        channel: "NOTE",
        direction: "IN",
        content: `[Khách đề nghị đổi lịch hẹn ${whenLabel}] ${msg || "(không ghi chú)"}`,
      },
    });
    await tx.appointment.update({ where: { id: appt.id }, data: { note: newNote } });
    await auditRequired(tx, null, "PORTAL_REQUEST_RESCHEDULE", { entity: "Appointment", entityId: appt.id, meta: { customerId: cust.id } });
  });

  revalidatePath(`/khach/${token}`);
  return { ok: true, nonce: Date.now() };
}
