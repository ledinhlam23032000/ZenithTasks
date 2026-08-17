import { format, startOfMonth, endOfMonth } from "date-fns";
import { vi } from "date-fns/locale";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isManagerial, ROLE_LABELS } from "@/lib/rbac";
import { fmtTime } from "@/lib/format";
import { vnDateOnly } from "@/lib/dates";
import { xlsxResponse, wordResponse, csvResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

/** Xuất chấm công CẢ TRUNG TÂM trong tháng (chỉ quản lý/admin — căn cứ tính lương): ?format=xlsx (mặc định) | doc | csv, ?m=yyyy-MM. */
export async function GET(request: Request) {
  const user = await requireCap("mod:cham-cong");
  if (!isManagerial(user.role)) {
    return new Response("Không có quyền", { status: 403 });
  }
  const url = new URL(request.url);
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const mParam = url.searchParams.get("m");
  // vnDateOnly() chốt đúng "tháng hiện tại" theo giờ VN dù TZ máy chủ có lệch hay không.
  const parsed = mParam ? new Date(`${mParam}-01T00:00:00`) : vnDateOnly();
  const monthDate = Number.isNaN(parsed.getTime()) ? vnDateOnly() : parsed;
  // Bọc vnDateOnly(): so với cột @db.Date phải chốt đúng mốc UTC-midnight theo lịch VN,
  // nếu không ngày cuối tháng trước sẽ lẫn vào tháng sau — xem giải thích ở cham-cong/page.tsx.
  const gte = vnDateOnly(startOfMonth(monthDate));
  const lte = vnDateOnly(endOfMonth(monthDate));
  const monthLabel = format(monthDate, "MM/yyyy");
  const fileBase = `cham-cong-${format(monthDate, "yyyy-MM")}`;

  const recs = await prisma.attendance.findMany({
    where: { date: { gte, lte } },
    orderBy: [{ date: "asc" }],
    include: { user: { select: { fullName: true, role: true } } },
  });

  const summaryMap = new Map<string, { name: string; role: string; days: number }>();
  for (const r of recs) {
    const e = summaryMap.get(r.userId) ?? { name: r.user.fullName, role: ROLE_LABELS[r.user.role], days: 0 };
    e.days++;
    summaryMap.set(r.userId, e);
  }
  const summaryRows: Cell[][] = [...summaryMap.values()]
    .sort((a, b) => b.days - a.days)
    .map((s) => [s.name, s.role, s.days]);

  const detailColumns = ["Nhân viên", "Vai trò", "Ngày", "Giờ vào", "Giờ ra", "Ghi chú"];
  const detailRows: Cell[][] = recs.map((r) => [
    r.user.fullName,
    ROLE_LABELS[r.user.role],
    format(new Date(r.date), "EEEE, dd/MM/yyyy", { locale: vi }),
    fmtTime(r.checkInAt),
    r.checkOutAt ? fmtTime(r.checkOutAt) : "",
    r.note ?? "",
  ]);
  const summaryColumns = ["Nhân viên", "Vai trò", "Số ngày công"];

  if (fmt === "doc") {
    return wordResponse(fileBase, {
      title: `Chấm công tháng ${monthLabel}`,
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [
        { heading: "Tổng hợp ngày công", columns: summaryColumns, rows: summaryRows },
        { heading: "Chi tiết theo ngày", columns: detailColumns, rows: detailRows },
      ],
    });
  }
  if (fmt === "csv") {
    return csvResponse(fileBase, [["TỔNG HỢP NGÀY CÔNG"], summaryColumns, ...summaryRows, [], ["CHI TIẾT THEO NGÀY"], detailColumns, ...detailRows]);
  }
  return xlsxResponse(fileBase, [
    { name: "Tổng hợp", columns: summaryColumns.map((header) => ({ header })), rows: summaryRows },
    { name: "Chi tiết", columns: detailColumns.map((header, i) => ({ header, width: i === 2 ? 22 : i === 5 ? 26 : 14 })), rows: detailRows },
  ]);
}
