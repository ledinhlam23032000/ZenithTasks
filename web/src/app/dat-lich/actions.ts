"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizePhone, phoneLast5 } from "@/lib/phone";
import { bump } from "@/lib/rate-limit";

export type BookingState = { ok?: boolean; error?: string };

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

  const parsed = schema.safeParse({
    guestName: formData.get("guestName") ?? "",
    phone: formData.get("phone") ?? "",
    scheduledAt: formData.get("scheduledAt") ?? "",
    serviceInterest: formData.get("serviceInterest") ?? "",
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ." };
  const d = parsed.data;

  const norm = normalizePhone(d.phone);
  if (norm.length < 9 || norm.length > 11) return { error: "Số điện thoại không hợp lệ (9–11 chữ số)." };
  const when = new Date(d.scheduledAt);
  if (Number.isNaN(when.getTime())) return { error: "Ngày giờ không hợp lệ." };
  if (when.getTime() < Date.now() - 60_000) return { error: "Vui lòng chọn thời gian trong tương lai." };

  await prisma.appointment.create({
    data: {
      guestName: d.guestName,
      phoneLast5: phoneLast5(norm),
      scheduledAt: when,
      type: "NEW",
      source: "OTHER",
      sourceDetail: "Đặt lịch online",
      serviceInterest: d.serviceInterest || null,
      // SĐT đầy đủ lưu ở ghi chú để lễ tân gọi lại (đây là yêu cầu đặt lịch, chưa phải hồ sơ khách).
      note: `SĐT khách: ${norm}${d.note ? ` · ${d.note}` : ""}`,
    },
  });

  revalidatePath("/lich-hen");
  revalidatePath("/dashboard");
  return { ok: true };
}
