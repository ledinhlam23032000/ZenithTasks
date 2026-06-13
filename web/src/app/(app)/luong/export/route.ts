import { requireUser } from "@/lib/auth";
import { getPayroll } from "@/lib/payroll";
import { ROLE_LABELS } from "@/lib/rbac";

function csvCell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Xuất bảng lương tháng ra CSV (mở được bằng Excel). */
export async function GET(req: Request) {
  await requireUser(["ADMIN", "MANAGER"]);
  const m = new URL(req.url).searchParams.get("m");
  const parsed = m ? new Date(`${m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const p = await getPayroll(monthDate);

  const rows: unknown[][] = [
    ["Nhân viên", "Vai trò", "Lương cơ bản", "% Hoa hồng", "Doanh thu phụ trách", "Hoa hồng", "Tổng nhận"],
    ...p.rows.map((r) => [r.name, ROLE_LABELS[r.role], r.base, r.rate, r.revenue, r.commission, r.total]),
    [],
    ["Cộng tác viên", "Hoa hồng"],
    ...p.ctv.map((c) => [c.name, c.amount]),
  ];
  // ﻿ (BOM) để Excel hiển thị đúng tiếng Việt.
  const csv = "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bang-luong-${m ?? "thang-nay"}.csv"`,
    },
  });
}
