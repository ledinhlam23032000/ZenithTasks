import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { getStaffPerformance } from "@/lib/performance";
import { ROLE_LABELS } from "@/lib/rbac";
import { xlsxResponse, wordResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireCap("mod:hieu-suat");
  const url = new URL(req.url);
  const m = url.searchParams.get("m");
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const parsed = m ? new Date(`${m}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const monthLabel = format(monthDate, "MM/yyyy");
  const fileBase = `hieu-suat-${format(monthDate, "yyyy-MM")}`;
  const rows = await getStaffPerformance(monthDate);

  const columns = ["Nhân viên", "Vai trò", "Ngày công", "Ca tư vấn", "Chốt (%)", "DS tư vấn", "Thực thu TV", "Thu nợ cũ (TV)", "Ca mổ", "DS mổ", "Thực thu BS", "Thu nợ cũ (BS)", "Tin CSKH"];
  const data: Cell[][] = rows.map((r) => [
    r.name, ROLE_LABELS[r.role], r.daysWorked, r.consultCases, r.consultRate, r.consultRevenue,
    r.collectedConsult.total, r.collectedConsult.fromDebt, r.doctorCases, r.doctorRevenue,
    r.collectedDoctor.total, r.collectedDoctor.fromDebt, r.careCount,
  ]);

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: `Hiệu suất nhân sự tháng ${monthLabel}`,
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [{ columns, rows: data }],
    });
  }
  return xlsxResponse(fileBase, [{ name: `Hiệu suất ${format(monthDate, "MM-yyyy")}`, columns: columns.map((header) => ({ header })), rows: data }]);
}
