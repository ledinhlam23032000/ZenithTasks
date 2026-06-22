import { requireCap } from "@/lib/auth";
import { getCollaborators, rangeBounds } from "@/lib/performance";
import { xlsxResponse, wordResponse, type Cell } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  await requireCap("mod:cong-tac-vien");
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "month";
  const fmt = url.searchParams.get("format") ?? "xlsx";
  const { gte, lte, label } = rangeBounds(range);
  const rows = await getCollaborators(gte, lte);

  const columns = ["Cộng tác viên", "Đã đăng ký", "Số khách", "Số ca", "Doanh số mang về", "Hoa hồng"];
  const data: Cell[][] = rows.map((r) => [r.name, r.registered ? "Có" : "Chưa", r.customers, r.cases, r.revenue, r.commission]);

  if (fmt === "doc") {
    return wordResponse("cong-tac-vien", {
      title: `Hiệu suất cộng tác viên — ${label}`,
      subtitle: "Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — BVĐK Hồng Phúc",
      sections: [{ columns, rows: data }],
    });
  }
  return xlsxResponse("cong-tac-vien", [{ name: "Cộng tác viên", columns: columns.map((header) => ({ header })), rows: data }]);
}
