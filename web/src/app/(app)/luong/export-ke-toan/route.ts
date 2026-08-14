// Xuất "Bảng lương kế toán" — 1 file .xlsx duy nhất gồm: sheet chính đúng mẫu
// công ty (xem lib/payroll-letterhead.ts) + 1 sheet phụ lục hoa hồng cho MỖI
// nhân sự có phát sinh hoa hồng trong tháng (xem lib/commission-appendix.ts).
// "1 cái click" xuất đủ cho kế toán/thuế theo đúng yêu cầu chủ dự án.

import { format, startOfMonth, endOfMonth } from "date-fns";
import { requireUser } from "@/lib/auth";
import { getPayroll, STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { getCommissionForMonth } from "@/lib/commission-data";
import { ROLE_LABELS } from "@/lib/rbac";
import { xlsxRichResponse } from "@/lib/export";
import { buildPayrollLetterheadSheet, type LetterheadRow } from "@/lib/payroll-letterhead";
import { buildCommissionAppendixSheet } from "@/lib/commission-appendix";
import type { RichSheet } from "@/lib/xlsx";
import { prisma } from "@/lib/db";
import { vnDateOnly } from "@/lib/dates";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireUser(["ADMIN", "MANAGER"]);
  const url = new URL(req.url);
  const m = url.searchParams.get("m");
  const standardDays = Math.max(1, Math.min(31, Number(url.searchParams.get("d")) || STANDARD_DAYS_DEFAULT));
  const parsed = m ? new Date(`${m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;

  const [payroll, commissionMap, attendanceRows] = await Promise.all([
    getPayroll(monthDate, standardDays),
    getCommissionForMonth(monthDate, standardDays),
    prisma.attendance.findMany({
      where: { date: { gte: vnDateOnly(startOfMonth(monthDate)), lte: vnDateOnly(endOfMonth(monthDate)) } },
      select: { userId: true, date: true },
    }),
  ]);

  const presentDaysByUser = new Map<string, Set<number>>();
  for (const a of attendanceRows) {
    const set = presentDaysByUser.get(a.userId) ?? new Set<number>();
    set.add(a.date.getUTCDate());
    presentDaysByUser.set(a.userId, set);
  }

  const letterheadRows: LetterheadRow[] = payroll.rows.map((r) => {
    const commission = commissionMap.get(r.id);
    return {
      name: r.name,
      roleLabel: ROLE_LABELS[r.role],
      baseFull: r.baseFull,
      baseActual: r.baseActual,
      daysWorked: r.daysWorked,
      presentDays: presentDaysByUser.get(r.id) ?? new Set<number>(),
      bonus: r.bonus,
      adjustment: r.adjustment,
      breakdown: commission?.breakdown ?? {
        attendanceWage: r.baseActual,
        lunchAllowance: 0,
        doctorService: 0,
        doctorConsult: 0,
        nurseService: 0,
        nurseConsult: 0,
        consultant: { newRevenue: 0, newRate: 0, newCommission: 0, returningRevenue: 0, returningRate: 0, returningCommission: 0, total: 0 },
        totalCommission: 0,
        total: r.baseActual,
      },
    };
  });

  const mainSheet = buildPayrollLetterheadSheet(monthDate, standardDays, letterheadRows);

  // Phụ lục hoa hồng — 1 sheet/người, chỉ với người có dòng phát sinh trong tháng.
  // Tên sheet Excel giới hạn 31 ký tự + không được trùng — cắt bớt + đánh số nếu đụng.
  const usedNames = new Set<string>(["Bảng lương"]);
  const appendixSheets: RichSheet[] = [];
  for (const r of payroll.rows) {
    const detail = commissionMap.get(r.id);
    if (!detail || detail.details.length === 0) continue;
    let name = `HH - ${r.name}`.slice(0, 31);
    let suffix = 2;
    while (usedNames.has(name)) {
      const base = `HH - ${r.name}`.slice(0, 31 - String(suffix).length - 3);
      name = `${base} (${suffix})`;
      suffix++;
    }
    usedNames.add(name);
    const sheet = buildCommissionAppendixSheet(r.name, monthDate, detail.details);
    if (sheet) appendixSheets.push({ ...sheet, name });
  }

  const fileBase = `bang-luong-ke-toan-${format(monthDate, "yyyy-MM")}`;
  return xlsxRichResponse(fileBase, [mainSheet, ...appendixSheets]);
}
