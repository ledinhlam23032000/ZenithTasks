import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { getMonthlyAccounting } from "@/lib/accounting";
import { STANDARD_DAYS_DEFAULT } from "@/lib/payroll";
import { ROLE_LABELS, isShareholder } from "@/lib/rbac";
import { PAYMENT_LABEL } from "@/lib/status";
import { categoryLabel } from "@/lib/finance";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

/** Xuất báo cáo kế toán tháng: ?format=xlsx (mặc định) | doc | csv. */
export async function GET(request: Request) {
  const user = await requireCap("mod:ke-toan");
  const canSeeInvestment = user.role === "ADMIN" || isShareholder(user.role);
  const url = new URL(request.url);
  const mParam = url.searchParams.get("m");
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const standardDays = Math.max(1, Math.min(31, Number(url.searchParams.get("d")) || STANDARD_DAYS_DEFAULT));

  const parsed = mParam ? new Date(`${mParam}-01T00:00:00`) : new Date();
  const monthDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  const a = await getMonthlyAccounting(monthDate, standardDays, canSeeInvestment);

  const monthLabel = format(monthDate, "MM/yyyy");
  const fileBase = `ke-toan-${a.monthKey}`;

  // 1) Kết quả kinh doanh
  const pnlColumns = ["Khoản mục", "Số tiền (VND)"];
  const pnlRows: Cell[][] = [
    ["Doanh thu dịch vụ (khách đã trả)", a.pnl.serviceRevenue],
    ["Thu khác", a.pnl.otherIncome],
    ["TỔNG THU", a.pnl.totalIncome],
    ["Chi vận hành", a.pnl.operatingExpense],
    ["Chi lương nhân viên", a.pnl.salaryExpense],
    ["Hoa hồng cộng tác viên", a.pnl.ctvCommission],
    ["TỔNG CHI", a.pnl.totalExpense],
    ["LÃI / LỖ", a.pnl.profit],
    [`Tỷ suất lợi nhuận (%)`, a.pnl.margin],
  ];

  // 2) Thực thu theo hình thức
  const methodColumns = ["Hình thức", "Số lượt", "Số tiền (VND)"];
  const methodRows: Cell[][] = a.revenueByMethod.map((m) => [PAYMENT_LABEL[m.method], m.count, m.amount]);
  methodRows.push(["Tổng thực thu", "", a.pnl.serviceRevenue]);

  // 3) Chi theo hạng mục
  const catColumns = ["Hạng mục chi", "Số tiền (VND)"];
  const catRows: Cell[][] = a.cash.expenseByCategory.map((c) => [categoryLabel(c.code), c.amount]);

  // 4) Bảng lương
  const payrollColumns = ["Nhân viên", "Vai trò", "Ngày công", "Lương cứng", "Hoa hồng", "Thưởng/ĐC", "Phải trả", "Trạng thái", "Ngày chi"];
  const payrollRows: Cell[][] = a.payroll.rows
    .filter((r) => r.total > 0 || r.daysWorked > 0)
    .map((r) => [
      r.name,
      ROLE_LABELS[r.role],
      `${r.daysWorked}/${a.standardDays}`,
      r.baseActual,
      r.commission,
      r.bonus + r.adjustment,
      r.total,
      r.cashTxId ? "Đã chi" : r.total > 0 ? "Chưa chi" : "—",
      r.paidAt ? format(r.paidAt, "dd/MM/yyyy") : "",
    ]);
  payrollRows.push(["TỔNG", "", "", a.payroll.totalBase, a.payroll.totalCommission, a.payroll.totalBonus, a.salary.payable, "", ""]);

  // 5) Hoa hồng cộng tác viên
  const ctvColumns = ["Cộng tác viên", "Phải trả (VND)", "Trạng thái"];
  const ctvRows: Cell[][] = a.ctv.map((c) => [c.name, c.amount, c.isPaid ? "Đã chi" : "Chưa chi"]);

  // 6) Công nợ
  const debtColumns = ["Khách hàng", "Mã hồ sơ", "Còn nợ (VND)"];
  const debtRows: Cell[][] = a.debt.top.map((d) => [d.customer.fullName, d.code, d.debt]);
  debtRows.push(["Tổng công nợ đến hiện tại", "", a.debt.outstanding]);

  const title = `Báo cáo kế toán tháng ${monthLabel}${a.closed ? " (đã chốt sổ)" : ""}`;

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title,
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc",
      sections: [
        { heading: "Kết quả kinh doanh", columns: pnlColumns, rows: pnlRows },
        { heading: "Thực thu theo hình thức thanh toán", columns: methodColumns, rows: methodRows },
        { heading: "Chi theo hạng mục", columns: catColumns, rows: catRows },
        { heading: "Bảng lương nhân viên", columns: payrollColumns, rows: payrollRows },
        { heading: "Hoa hồng cộng tác viên", columns: ctvColumns, rows: ctvRows },
        { heading: "Công nợ khách hàng", columns: debtColumns, rows: debtRows },
      ],
    });
  }

  if (fmt === "csv") {
    return csvResponse(fileBase, [
      [title],
      [],
      pnlColumns,
      ...pnlRows,
      [],
      methodColumns,
      ...methodRows,
      [],
      catColumns,
      ...catRows,
      [],
      payrollColumns,
      ...payrollRows,
      [],
      ctvColumns,
      ...ctvRows,
      [],
      debtColumns,
      ...debtRows,
    ]);
  }

  return xlsxResponse(fileBase, [
    {
      name: `Ket qua ${format(monthDate, "MM-yyyy")}`,
      columns: [{ header: pnlColumns[0], width: 40 }, { header: pnlColumns[1], width: 20 }],
      rows: pnlRows,
    },
    {
      name: "Thuc thu",
      columns: methodColumns.map((header, i) => ({ header, width: i === 0 ? 22 : 16 })),
      rows: methodRows,
    },
    {
      name: "Chi theo hang muc",
      columns: catColumns.map((header, i) => ({ header, width: i === 0 ? 30 : 18 })),
      rows: catRows,
    },
    {
      name: "Bang luong",
      columns: payrollColumns.map((header, i) => ({ header, width: i === 0 ? 24 : i === 1 ? 18 : 14 })),
      rows: payrollRows,
    },
    {
      name: "Hoa hong CTV",
      columns: ctvColumns.map((header, i) => ({ header, width: i === 0 ? 26 : 16 })),
      rows: ctvRows,
    },
    {
      name: "Cong no",
      columns: debtColumns.map((header, i) => ({ header, width: i === 0 ? 26 : 16 })),
      rows: debtRows,
    },
  ]);
}
