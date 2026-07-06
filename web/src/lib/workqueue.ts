import { startOfDay, endOfDay, addDays, subDays } from "date-fns";
import { prisma } from "./db";
import { toNum } from "./money";
import type { Tone } from "@/components/ui/badge";

// ============================================================================
// "VIỆC CẦN LÀM HÔM NAY" (B1 — lõi) — tổng hợp việc TỪ DỮ LIỆU SẴN CÓ (không đổi
// schema, không cần cron). Biến app từ "ghi chép" sang "chủ động nhắc nhân viên".
//
// Các nhóm việc:
//   • Tái khám đến hạn (FollowUp tới hạn, chưa xong)
//   • Hẹn hôm nay chưa đến (Appointment hôm nay chưa check-in → gọi xác nhận)
//   • Công nợ cần thu (hồ sơ còn nợ, quá hạn)
//   • Khách nguội (lâu chưa quay lại, không có lịch tái khám) → mời quay lại
//   • Sinh nhật khách hôm nay → gửi lời chúc / ưu đãi
//   • Kho cảnh báo (tồn thấp / sắp - đã hết hạn)
// ============================================================================

const COLD_DAYS = 60; // khách "nguội" nếu hồ sơ mới nhất cũ hơn ngần này
const DEBT_OVERDUE_DAYS = 15; // công nợ "cần thu" nếu hồ sơ tạo trước ngần này
const FOLLOWUP_LOOKAHEAD_DAYS = 2; // nhắc tái khám trong vài ngày tới
const TAKE = 50;

export type WorkItem = {
  id: string;
  title: string;
  subtitle?: string;
  href?: string;
  badge?: string;
  // Nếu có: cho phép "Thu nợ" ngay trên dòng (chỉ dùng cho nhóm công nợ).
  collect?: { caseId: string; caseCode: string; customerName: string; debt: number };
};
export type WorkSection = { key: string; label: string; hint: string; tone: Tone; icon: string; count: number; items: WorkItem[] };

function maskTail(last5: string | null | undefined): string {
  return last5 ? `••• ${last5}` : "";
}

export async function getWorkqueue(): Promise<{ sections: WorkSection[]; total: number }> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const followUpEnd = endOfDay(addDays(now, FOLLOWUP_LOOKAHEAD_DAYS));
  const debtBefore = subDays(now, DEBT_OVERDUE_DAYS);

  const [followUps, todayAppts, debtors, materials, birthdays, cold] = await Promise.all([
    prisma.followUp.findMany({
      where: { scheduledAt: { gte: todayStart, lte: followUpEnd }, doneAt: null, status: { in: ["BOOKED", "CONFIRMED"] } },
      orderBy: { scheduledAt: "asc" },
      take: TAKE,
      include: { customer: { select: { id: true, fullName: true, phoneLast5: true } } },
    }),
    prisma.appointment.findMany({
      where: { scheduledAt: { gte: todayStart, lte: todayEnd }, status: { in: ["BOOKED", "CONFIRMED"] }, arrivedAt: null },
      orderBy: { scheduledAt: "asc" },
      take: TAKE,
      include: { customer: { select: { id: true, fullName: true } } },
    }),
    prisma.caseRecord.findMany({
      where: { debtAmount: { gt: 0 }, createdAt: { lt: debtBefore } },
      orderBy: { debtAmount: "desc" },
      take: TAKE,
      include: { customer: { select: { id: true, fullName: true, phoneLast5: true } } },
    }),
    prisma.material.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    // Sinh nhật hôm nay (so theo tháng/ngày).
    prisma.$queryRaw<Array<{ id: string; fullName: string; phoneLast5: string | null }>>`
      SELECT id, "fullName", "phoneLast5" FROM "Customer"
      WHERE dob IS NOT NULL
        AND EXTRACT(MONTH FROM dob) = EXTRACT(MONTH FROM now())
        AND EXTRACT(DAY FROM dob) = EXTRACT(DAY FROM now())
      LIMIT ${TAKE}`,
    // Khách nguội: hồ sơ mới nhất cũ hơn COLD_DAYS và KHÔNG có lịch tái khám sắp tới.
    prisma.$queryRaw<Array<{ id: string; fullName: string; phoneLast5: string | null; last: Date }>>`
      SELECT c.id, c."fullName", c."phoneLast5", MAX(cr."createdAt") AS last
      FROM "Customer" c
      JOIN "CaseRecord" cr ON cr."customerId" = c.id
      WHERE NOT EXISTS (
        SELECT 1 FROM "FollowUp" f
        WHERE f."customerId" = c.id AND f."scheduledAt" >= now() AND f."doneAt" IS NULL
      )
      GROUP BY c.id, c."fullName", c."phoneLast5"
      HAVING MAX(cr."createdAt") < now() - make_interval(days => ${COLD_DAYS})
      ORDER BY last DESC
      LIMIT 30`,
  ]);

  // Kho cảnh báo (tái dùng logic trang Kho).
  const soon = new Date(now.getTime() + 30 * 86400000);
  const stockAlerts: WorkItem[] = [];
  for (const m of materials) {
    const stock = toNum(m.stock);
    const min = toNum(m.minStock);
    const exp = m.expiryDate ? new Date(m.expiryDate) : null;
    const low = stock <= min;
    const expired = exp ? exp < now : false;
    const expiringSoon = exp ? exp >= now && exp <= soon : false;
    if (!low && !expired && !expiringSoon) continue;
    const badge = expired ? "Hết hạn" : low ? (stock <= 0 ? "Hết hàng" : "Tồn thấp") : "Sắp hết hạn";
    stockAlerts.push({ id: m.id, title: m.name, subtitle: `Tồn ${stock} ${m.unit}`, href: "/kho", badge });
  }

  const fmtTime = (d: Date) => new Intl.DateTimeFormat("vi-VN", { hour: "2-digit", minute: "2-digit" }).format(d);

  const sections: WorkSection[] = [
    {
      key: "follow-up",
      label: "Tái khám đến hạn",
      hint: "Gọi nhắc khách lịch tái khám sắp tới.",
      tone: "purple",
      icon: "CalendarClock",
      count: followUps.length,
      items: followUps.map((f) => ({
        id: f.id,
        title: f.customer.fullName,
        subtitle: `${fmtTime(f.scheduledAt)}${f.note ? ` · ${f.note}` : ""} ${maskTail(f.customer.phoneLast5)}`.trim(),
        href: `/khach-hang/${f.customer.id}`,
      })),
    },
    {
      key: "today-appt",
      label: "Hẹn hôm nay chưa đến",
      hint: "Gọi xác nhận để giảm khách hẹn không đến.",
      tone: "blue",
      icon: "CalendarCheck",
      count: todayAppts.length,
      items: todayAppts.map((a) => ({
        id: a.id,
        title: a.customer?.fullName || a.guestName || "Khách",
        subtitle: `${fmtTime(a.scheduledAt)}${a.serviceInterest ? ` · ${a.serviceInterest}` : ""}`,
        href: "/lich-hen",
      })),
    },
    {
      key: "debt",
      label: "Công nợ cần thu",
      hint: `Hồ sơ còn nợ, quá ${DEBT_OVERDUE_DAYS} ngày.`,
      tone: "red",
      icon: "Wallet",
      count: debtors.length,
      items: debtors.map((c) => ({
        id: c.id,
        title: c.customer.fullName,
        subtitle: `${c.code} ${maskTail(c.customer.phoneLast5)}`.trim(),
        href: `/ho-so/${c.id}`,
        badge: new Intl.NumberFormat("vi-VN").format(toNum(c.debtAmount)) + "đ",
        collect: { caseId: c.id, caseCode: c.code, customerName: c.customer.fullName, debt: toNum(c.debtAmount) },
      })),
    },
    {
      key: "birthday",
      label: "Sinh nhật khách hôm nay",
      hint: "Gửi lời chúc / ưu đãi để gắn kết.",
      tone: "pink",
      icon: "MessageCircleHeart",
      count: birthdays.length,
      items: birthdays.map((b) => ({
        id: b.id,
        title: b.fullName,
        subtitle: maskTail(b.phoneLast5),
        href: `/khach-hang/${b.id}`,
      })),
    },
    {
      key: "cold",
      label: "Khách lâu chưa quay lại",
      hint: `Hơn ${COLD_DAYS} ngày chưa đến, chưa có lịch tái khám — mời quay lại.`,
      tone: "amber",
      icon: "Users",
      count: cold.length,
      items: cold.map((c) => ({
        id: c.id,
        title: c.fullName,
        subtitle: maskTail(c.phoneLast5),
        href: `/khach-hang/${c.id}`,
      })),
    },
    {
      key: "stock",
      label: "Kho cần xử lý",
      hint: "Tồn thấp hoặc sắp / đã hết hạn.",
      tone: "amber",
      icon: "Boxes",
      count: stockAlerts.length,
      items: stockAlerts,
    },
  ];

  const total = sections.reduce((s, x) => s + x.count, 0);
  return { sections, total };
}
