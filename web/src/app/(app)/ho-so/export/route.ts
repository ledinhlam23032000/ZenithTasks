import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { loadCaseFinancials } from "@/lib/financial-summary-db";
import { maskPhone, isValidLast5 } from "@/lib/phone";
import { CASE_STATUS, CONSULT_RESULT } from "@/lib/status";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";
import type { Prisma, CaseStatus } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

/** Xuất DANH SÁCH hồ sơ điều trị (toàn bộ khớp bộ lọc, không giới hạn theo trang): ?format=xlsx (mặc định) | doc | csv, ?q=, ?status=. */
export async function GET(request: Request) {
  const user = await requireCap("mod:ho-so");
  const url = new URL(request.url);
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const q = (url.searchParams.get("q") ?? "").trim();
  const status = (url.searchParams.get("status") ?? "").trim();

  // Cùng phạm vi phân quyền với trang /ho-so: tư vấn/bác sĩ chỉ xuất được hồ sơ của mình.
  const scope: Prisma.CaseRecordWhereInput =
    user.role === "CONSULTANT" ? { consultantId: user.id } : user.role === "DOCTOR" ? { doctorId: user.id } : {};
  const filters: Prisma.CaseRecordWhereInput = { ...scope };
  if (status) filters.status = status as CaseStatus;
  if (q) {
    filters.customer = isValidLast5(q) ? { phoneLast5: q } : { fullName: { contains: q, mode: "insensitive" } };
  }

  const cases = await prisma.caseRecord.findMany({
    where: filters,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { fullName: true, phoneLast5: true } },
      consultant: { select: { fullName: true } },
      doctor: { select: { fullName: true } },
    },
  });
  const financials = await loadCaseFinancials(cases.map((c) => c.id));

  const fileBase = `ho-so-${format(new Date(), "yyyy-MM-dd")}`;
  const columns = [
    "Mã hồ sơ",
    "Khách hàng",
    "SĐT",
    "Trạng thái",
    "Kết quả tư vấn",
    "Tư vấn viên",
    "Bác sĩ",
    "Tổng tiền (VND)",
    "Đã thu (VND)",
    "Còn nợ (VND)",
    "Giảm giá (VND)",
    "Voucher (VND)",
    "Ngày tạo",
  ];
  const rows: Cell[][] = cases.map((c) => {
    const financial = financials.get(c.id);
    return [
      c.code,
      c.customer.fullName,
      maskPhone(c.customer.phoneLast5),
      CASE_STATUS[c.status].label,
      CONSULT_RESULT[c.consultResult].label,
      c.consultant?.fullName ?? "",
      c.doctor?.fullName ?? "",
      financial?.total ?? 0,
      financial?.paid ?? 0,
      financial?.debt ?? 0,
      financial?.lineDiscount ?? 0,
      financial?.voucher ?? 0,
      format(c.createdAt, "dd/MM/yyyy"),
    ];
  });
  const totals: Cell[][] = [
    [
      `Tổng ${cases.length} hồ sơ`,
      "",
      "",
      "",
      "",
      "",
      "",
      cases.reduce((s, c) => s + (financials.get(c.id)?.total ?? 0), 0),
      cases.reduce((s, c) => s + (financials.get(c.id)?.paid ?? 0), 0),
      cases.reduce((s, c) => s + (financials.get(c.id)?.debt ?? 0), 0),
    ],
  ];

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: "Danh sách hồ sơ điều trị",
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [{ columns, rows: [...rows, [], ...totals] }],
    });
  }
  if (fmt === "csv") {
    return csvResponse(fileBase, [columns, ...rows, [], ...totals]);
  }
  return xlsxResponse(fileBase, [
    {
      name: "Hồ sơ điều trị",
      columns: columns.map((header, i) => ({ header, width: i === 1 ? 22 : 15 })),
      rows: [...rows, [], ...totals],
    },
  ]);
}
