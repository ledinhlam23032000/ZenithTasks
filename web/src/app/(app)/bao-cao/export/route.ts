import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { getAdminDashboard } from "@/lib/dashboard";
import { getReports } from "@/lib/reports";
import { maskPhone } from "@/lib/phone";
import { SOURCE_LABEL } from "@/lib/status";
import { xlsxResponse, wordResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

/** Xuất báo cáo tổng hợp: ?format=xlsx (mặc định) | doc. */
export async function GET(request: Request) {
  await requireCap("mod:bao-cao");
  const fmt = new URL(request.url).searchParams.get("format") ?? "xlsx";
  const [d, r] = await Promise.all([getAdminDashboard(), getReports()]);
  const monthLabel = format(new Date(), "MM/yyyy");
  const fileBase = `bao-cao-${format(new Date(), "yyyy-MM")}`;

  const overview: Cell[][] = [
    ["Doanh thu tháng này", r.revenue.thisMonth],
    ["Doanh thu tháng trước", r.revenue.lastMonth],
    ["Tăng trưởng (%)", r.revenue.growth],
    ["Số ca tháng này", r.cases.thisMonth],
    ["Tỉ lệ chốt tư vấn (%)", d.consultRate.rate],
    ["Số ca chốt / tổng", `${d.consultRate.agreed}/${d.consultRate.total}`],
    ["Công nợ tồn", r.outstandingDebt],
  ];
  const consultants: Cell[][] = d.consultants.map((c) => [c.name, c.consults, c.rate, c.revenue]);
  const doctors: Cell[][] = r.doctors.map((c) => [c.name, c.cases, c.revenue]);
  const services: Cell[][] = r.topServices.map((s) => [s.name, s.count, s.revenue]);
  const sources: Cell[][] = r.sources.map((s) => [SOURCE_LABEL[s.source], s.count]);
  const debtors: Cell[][] = r.topDebtors.map((x) => [
    x.customer.fullName,
    x.customer.code ?? "",
    maskPhone(x.customer.phoneLast5),
    x.debt,
  ]);

  const overviewCols = ["Chỉ tiêu", "Giá trị"];
  const consultantCols = ["Tư vấn viên", "Số ca", "Tỉ lệ chốt (%)", "Doanh thu"];
  const doctorCols = ["Bác sĩ", "Số ca", "Doanh thu"];
  const serviceCols = ["Dịch vụ", "Lượt", "Doanh thu"];
  const sourceCols = ["Nguồn khách", "Số lượng"];
  const debtorCols = ["Khách hàng", "Mã", "SĐT", "Công nợ"];

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: `Báo cáo phòng khám tháng ${monthLabel}`,
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [
        { heading: "Tổng quan", columns: overviewCols, rows: overview },
        { heading: "Hiệu suất tư vấn viên", columns: consultantCols, rows: consultants },
        { heading: "Năng suất bác sĩ", columns: doctorCols, rows: doctors },
        { heading: "Dịch vụ nổi bật", columns: serviceCols, rows: services },
        { heading: "Nguồn khách", columns: sourceCols, rows: sources },
        { heading: "Công nợ cần thu", columns: debtorCols, rows: debtors },
      ],
    });
  }

  const mk = (cols: string[]) => cols.map((header) => ({ header }));
  return xlsxResponse(fileBase, [
    { name: "Tổng quan", columns: mk(overviewCols), rows: overview },
    { name: "Tư vấn viên", columns: mk(consultantCols), rows: consultants },
    { name: "Bác sĩ", columns: mk(doctorCols), rows: doctors },
    { name: "Dịch vụ", columns: mk(serviceCols), rows: services },
    { name: "Nguồn khách", columns: mk(sourceCols), rows: sources },
    { name: "Công nợ", columns: mk(debtorCols), rows: debtors },
  ]);
}
