"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { encryptPhone, hashPhone, normalizePhone, phoneLast5 } from "@/lib/phone";
import { bump } from "@/lib/rate-limit";

export type BookingValues = { guestName: string; phone: string; scheduledAt: string; serviceInterest: string; note: string };
export type BookingState = { ok?: boolean; error?: string; values?: BookingValues };

function valuesFrom(formData: FormData): BookingValues {
  return {
    guestName: String(formData.get("guestName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    scheduledAt: String(formData.get("scheduledAt") ?? ""),
    serviceInterest: String(formData.get("serviceInterest") ?? ""),
    note: String(formData.get("note") ?? ""),
  };
}

const schema = z.object({
  guestName: z.string().trim().min(1, "Vui lòng nhập họ tên."),
  phone: z.string().trim().min(1, "Vui lòng nhập số điện thoại."),
  scheduledAt: z.string().min(1, "Vui lòng chọn ngày giờ mong muốn."),
  serviceInterest: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

export async function createPublicAppointment(_prev: BookingState, formData: FormData): Promise<BookingState> {
  // Honeypot: bot thường tự điền ô ẩn này -> coi như thành công nhưng bỏ qua.
  if (String(formData.get("company") ?? "").trim() !== "") return { ok: true };

  const h = await headers();
  const ip = (h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0] || "local").trim();
  if (bump(`book:${ip}`, 5)) return { error: "Bạn gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút." };

  const values = valuesFrom(formData);
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ.", values };
  const d = parsed.data;

  const norm = normalizePhone(d.phone);
  if (norm.length < 9 || norm.length > 11) return { error: "Số điện thoại không hợp lệ (9–11 chữ số).", values };
  const when = new Date(d.scheduledAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày giờ không hợp lệ.", values };
  if (when.getTime() < Date.now() - 60_000) return { error: "Vui lòng chọn thời gian trong tương lai.", values };

  await prisma.appointment.create({
    data: {
      guestName: d.guestName,
      phoneLast5: phoneLast5(norm),
      phoneEnc: encryptPhone(norm),
      phoneHash: hashPhone(norm),
      scheduledAt: when,
      type: "NEW",
      source: "OTHER",
      sourceDetail: "Đặt lịch online",
      serviceInterest: d.serviceInterest || null,
      // Không lưu SĐT rõ trong note; bản đầy đủ chỉ nằm ở cột mã hóa.
      note: d.note || null,
    },
  });

  revalidatePath("/lich-hen");
  revalidatePath("/dashboard");
  return { ok: true };
}
