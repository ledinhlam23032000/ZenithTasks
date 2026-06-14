import { requireUser } from "@/lib/auth";
import { getPayroll, STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { ROLE_LABELS } from "@/lib/rbac";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Xuất bảng lương tháng ra CSV (mở được bằng Excel). */
export async function GET(req: Request) {
  await requireUser(["ADMIN", "MANAGER"]);
  const url = new URL(req.url);
  const m = url.searchParams.get("m");
  const standardDays = Math.max(1, Math.min(31, Number(url.searchParams.get("d")) || STANDARD_DAYS_DEFAULT));
  const parsed = m ? new Date(`${m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const p = await getPayroll(monthDate, standardDays);

  const rows: unknown[][] = [
    ["Nhân viên", "Vai trò", "Ngày công", `Ngày chuẩn`, "Lương cứng", "Hoa hồng", "Diễn giải hoa hồng", "Thưởng", "Điều chỉnh", "Tổng nhận"],
    ...p.rows.map((r) => [r.name, ROLE_LABELS[r.role], r.daysWorked, standardDays, r.baseActual, r.commission, r.commissionNote, r.bonus, r.adjustment, r.total]),
    [],
    ["Cộng tác viên", "Hoa hồng"],
    ...p.ctv.map((c) => [c.name, c.amount]),
  ];
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bang-luong-${m ?? "thang-nay"}.csv"`,
    },
  });
}
