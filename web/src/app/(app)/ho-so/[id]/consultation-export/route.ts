import { prisma } from "@/lib/db";
import { requireCap } from "@/lib/auth";
import { wordResponse } from "@/lib/export";

const screeningLabels = ["Huyết áp", "Tim mạch", "Tiểu đường", "Hô hấp", "Bệnh truyền nhiễm", "Tuyến giáp", "Máu khó đông", "Dị ứng thuốc", "Dị ứng thức ăn/cao su", "Thuốc chống đông", "Thuốc nam/bắc/TPCN", "Thuốc lá/rượu bia", "Chất kích thích", "Phẫu thuật trước đây", "Biến chứng gây tê/gây mê", "Mang thai", "Cho con bú", "Kỳ kinh nguyệt"];

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  await requireCap("mod:ho-so");
  const { id } = await context.params;
  const record = await prisma.caseRecord.findUnique({ where: { id }, include: { customer: { select: { fullName: true, code: true, phoneLast5: true, gender: true, address: true } }, consultation: true, consultant: { select: { fullName: true } }, doctor: { select: { fullName: true } } } });
  if (!record) return new Response("Không tìm thấy hồ sơ", { status: 404 });
  const c = record.consultation;
  const screening = c?.screening && typeof c.screening === "object" && !Array.isArray(c.screening) ? c.screening as Record<string, unknown> : {};
  return wordResponse(`so-tu-van-${record.code}`, {
    title: "SỔ TƯ VẤN DỊCH VỤ PHẪU THUẬT TẠO HÌNH THẨM MỸ",
    subtitle: `Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc · Hồ sơ ${record.code}`,
    sections: [
      { heading: "I. Thông tin khách hàng", columns: ["Trường", "Nội dung"], rows: [["Họ tên", record.customer.fullName], ["Mã khách hàng", record.customer.code], ["SĐT (5 số cuối)", record.customer.phoneLast5], ["Giới tính", record.customer.gender ?? ""], ["Địa chỉ", record.customer.address ?? ""], ["Người tư vấn", record.consultant?.fullName ?? ""], ["Bác sĩ", record.doctor?.fullName ?? ""]] },
      { heading: "II. Thông tin bổ sung và sinh hiệu", columns: ["Trường", "Nội dung"], rows: [["Cân nặng (kg)", c?.weightKg ? Number(c.weightKg) : ""], ["Chiều cao (cm)", c?.heightCm ? Number(c.heightCm) : ""], ["Nhóm máu", c?.bloodType ?? ""], ["Liên hệ khẩn cấp", c?.emergencyName ?? ""], ["SĐT khẩn cấp", c?.emergencyPhone ?? ""], ["Mạch/phút", c?.pulse ?? ""], ["Huyết áp", c?.bloodPressure ?? ""], ["Nhiệt độ °C", c?.temperatureC ? Number(c.temperatureC) : ""], ["Nhịp thở/phút", c?.respiratoryRate ?? ""], ["SpO2 %", c?.spo2 ?? ""]] },
      { heading: "III. Sàng lọc y tế", columns: ["Nội dung", "Kết quả"], rows: screeningLabels.map((label) => [label, screening[label] === true ? "Có/đáng lưu ý — cần xem lại" : "Không ghi nhận theo thông tin đã khai"]) },
      { heading: "IV. Tư vấn và chỉ định", columns: ["Trường", "Nội dung"], rows: [["Mong muốn", c?.wants ?? ""], ["Tình trạng hiện tại", c?.currentCondition ?? ""], ["Kết quả dự tính", c?.expectedResult ?? ""], ["Chỉ định bác sĩ", c?.doctorIndication ?? ""], ["Xác nhận khách", c?.patientConfirmed ? "Đã xác nhận" : "Chưa xác nhận"]] },
      { heading: "V. Ký xác nhận", columns: ["Khách hàng", "Bác sĩ/nhân sự phụ trách", "Đại diện đơn vị"], rows: [["\n\n\n(Ký, ghi rõ họ tên)", "\n\n\n(Ký, ghi rõ họ tên)", "\n\n\n(Ký, ghi rõ họ tên)"]] },
    ],
  });
}
