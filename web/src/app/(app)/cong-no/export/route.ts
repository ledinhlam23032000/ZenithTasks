import { format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { toNum } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { DEBT_BUCKETS, DEBT_BUCKET_LABEL, debtAgeDays, debtAgingBucket, isOverThreshold } from "@/lib/debt-aging";
import { nextDueDate } from "@/lib/debt-plan";
import { getDebtThreshold } from "@/lib/settings";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

/** Xuất sổ công nợ (toàn bộ hồ sơ còn nợ, đúng bộ lọc đang xem): ?format=xlsx (mặc định) | doc | csv, ?bucket=, ?tv=. */
export async function GET(request: Request) {
  await requireCap("mod:cong-no");
  const url = new URL(request.url);
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const bucketParam = url.searchParams.get("bucket");
  const bucket = DEBT_BUCKETS.includes(bucketParam as never) ? (bucketParam as (typeof DEBT_BUCKETS)[number]) : "all";
  const tvFilter = (url.searchParams.get("tv") ?? "").trim();

  const threshold = await getDebtThreshold();
  const now = new Date();

  const cases = await prisma.caseRecord.findMany({
    where: { debtAmount: { gt: 0 } },
    orderBy: { debtAmount: "desc" },
    select: {
      id: true,
      code: true,
      debtAmount: true,
      createdAt: true,
      customer: { select: { fullName: true } },
      consultant: { select: { id: true, fullName: true } },
      debtPlan: { select: { dayOfMonth: true, monthlyAmount: true } },
    },
  });

  const rows0 = cases
    .map((c) => {
      const days = debtAgeDays(c.createdAt, now);
      const debt = toNum(c.debtAmount);
      return { ...c, days, debt, bucket: debtAgingBucket(days), over: isOverThreshold(debt, threshold) };
    })
    .filter((r) => (bucket === "all" ? true : r.bucket === bucket))
    .filter((r) => (tvFilter ? r.consultant?.id === tvFilter : true));

  const totalDebt = rows0.reduce((s, r) => s + r.debt, 0);
  const scopeLabel = bucket === "all" ? "Tất cả" : DEBT_BUCKET_LABEL[bucket];
  const fileBase = `cong-no-${format(now, "yyyy-MM-dd")}`;

  const columns = ["Khách hàng", "Mã hồ sơ", "Ngày tạo", "Tư vấn viên", "Tuổi nợ (ngày)", "Nhóm tuổi nợ", "Công nợ (VND)", "Vượt ngưỡng", "Hẹn nợ"];
  const rows: Cell[][] = rows0.map((r) => [
    r.customer.fullName,
    r.code,
    fmtDate(r.createdAt),
    r.consultant?.fullName ?? "",
    r.days,
    DEBT_BUCKET_LABEL[r.bucket],
    r.debt,
    r.over ? "Có" : "",
    r.debtPlan ? `${toNum(r.debtPlan.monthlyAmount)}/tháng · kỳ ${fmtDate(nextDueDate(r.debtPlan.dayOfMonth, now))}` : "",
  ]);
  const totalRow: Cell[][] = [["Tổng công nợ", "", "", "", "", "", totalDebt]];

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: `Sổ công nợ — ${scopeLabel} (tính đến ${fmtDate(now)})`,
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [{ heading: `${rows0.length} hồ sơ còn nợ`, columns, rows: [...rows, [], ...totalRow] }],
    });
  }
  if (fmt === "csv") {
    return csvResponse(fileBase, [columns, ...rows, [], ...totalRow]);
  }
  return xlsxResponse(fileBase, [
    {
      name: "Công nợ",
      columns: columns.map((header, i) => ({ header, width: i === 8 ? 30 : i === 0 ? 22 : 16 })),
      rows: [...rows, [], ...totalRow],
    },
  ]);
}
