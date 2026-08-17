import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { wordResponse } from "@/lib/export";
import { formatVND } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { paymentRequestStatusLabel, paymentRequestTypeLabel } from "@/lib/payment-request";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireCap("mod:ke-toan");
  const { id } = await context.params;
  const item = await prisma.paymentRequest.findUnique({ where: { id }, include: { requester: { select: { fullName: true } }, approver: { select: { fullName: true } } } });
  if (!item) return new Response("Không tìm thấy chứng từ", { status: 404 });
  const details = item.details && typeof item.details === "object" && !Array.isArray(item.details) ? item.details as Record<string, unknown> : {};
  const note = typeof details.note === "string" ? details.note : "";
  const file = wordResponse(`giay-de-nghi-${item.requestNo}`, {
    title: "GIẤY ĐỀ NGHỊ THANH TOÁN",
    subtitle: "CÔNG TY CỔ PHẦN BỆNH VIỆN HỒNG PHÚC — Trung tâm Phẫu thuật Tạo hình Thẩm mỹ",
    sections: [
      { columns: ["Trường thông tin", "Nội dung"], rows: [
        ["Số phiếu", item.requestNo],
        ["Loại khoản chi", paymentRequestTypeLabel(item.type)],
        ["Trạng thái", paymentRequestStatusLabel(item.status)],
        ["Người/đơn vị nhận tiền", item.payeeName],
        ["Số tiền", formatVND(Number(item.amount))],
        ["Bằng chữ", "Đề nghị kế toán ghi bổ sung bằng chữ khi in chính thức."],
        ["Tháng hạch toán", item.month ?? ""],
        ["Lý do/nội dung", item.reason],
        ["Ghi chú", note],
      ] },
      { heading: "Lịch sử xử lý", columns: ["Mốc", "Người thực hiện / ngày"], rows: [
        ["Người đề nghị", `${item.requester.fullName} — ${fmtDate(item.requestedAt)}`],
        ["Người duyệt", item.approver ? `${item.approver.fullName} — ${item.approvedAt ? fmtDate(item.approvedAt) : ""}` : ""],
        ["Ngày thanh toán", item.paidAt ? fmtDate(item.paidAt) : "Chưa thanh toán"],
      ] },
      { heading: "Ký xác nhận", columns: ["Người đề nghị", "Kế toán", "Thủ trưởng đơn vị"], rows: [["\n\n\n(Ký, ghi rõ họ tên)", "\n\n\n(Ký, ghi rõ họ tên)", "\n\n\n(Ký, ghi rõ họ tên)"]] },
    ],
  });
  return file;
}
