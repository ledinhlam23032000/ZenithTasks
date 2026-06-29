// ============================================================================
// TRỢ LÝ AI HỎI-ĐÁP (D1) — phần THUẦN: định dạng bối cảnh dữ liệu + lời nhắc.
//
// Nguyên tắc an toàn: KHÔNG cho AI truy cập thẳng cơ sở dữ liệu. Máy chủ tính sẵn
// một "ảnh chụp" số liệu tổng hợp (KHÔNG gồm SĐT / dữ liệu y khoa nhạy cảm) rồi đưa
// cho AI; AI chỉ được trả lời DỰA TRÊN số liệu đó. Nhờ vậy tránh bịa số & rò rỉ.
// ============================================================================

export type AssistantContext = {
  today: string; // dd/MM/yyyy
  periodDays: number;
  revenue: number; // thực thu trong kỳ (tổng Payment)
  newCustomers: number;
  newCases: number;
  appointmentsToday: number;
  followUpsNext7: number;
  debtTotal: number;
  debtCount: number;
  topDebtors: Array<{ name: string; amount: number }>;
  topServices: Array<{ name: string; count: number; revenue: number }>;
  segments: { champion: number; loyal: number; new: number; at_risk: number; hibernating: number; others: number };
  churnRiskCount: number;
  churnTop: Array<{ name: string; monetary: number; recencyDays: number }>;
  lowStock: Array<{ name: string; stock: number; minStock: number; unit: string }>;
  leads: { total: number; open: number; converted: number; conversionRate: number };
  marketing: { spend: number; revenue: number; roi: number | null };
};

const vnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

/** Render bối cảnh số liệu thành văn bản gọn (tiếng Việt) để đưa cho AI. */
export function formatAssistantContext(c: AssistantContext): string {
  const L: string[] = [];
  L.push(`Hôm nay: ${c.today}. Số liệu kinh doanh trong ${c.periodDays} ngày gần nhất (trừ khi ghi rõ khác).`);
  L.push("");
  L.push("== TỔNG QUAN ==");
  L.push(`- Thực thu ${c.periodDays} ngày: ${vnd(c.revenue)}.`);
  L.push(`- Khách mới: ${c.newCustomers}. Hồ sơ mới: ${c.newCases}.`);
  L.push(`- Lịch hẹn hôm nay: ${c.appointmentsToday}. Tái khám trong 7 ngày tới: ${c.followUpsNext7}.`);
  L.push("");
  L.push("== CÔNG NỢ ==");
  L.push(`- Tổng công nợ còn lại: ${vnd(c.debtTotal)} (${c.debtCount} hồ sơ).`);
  if (c.topDebtors.length) {
    L.push("- Khách nợ nhiều nhất:");
    for (const d of c.topDebtors) L.push(`  • ${d.name}: ${vnd(d.amount)}`);
  }
  L.push("");
  L.push("== DỊCH VỤ BÁN CHẠY ==");
  if (c.topServices.length) {
    for (const s of c.topServices) L.push(`- ${s.name}: ${s.count} lần, doanh thu ${vnd(s.revenue)}.`);
  } else {
    L.push("- (chưa có dữ liệu trong kỳ)");
  }
  L.push("");
  L.push("== KHÁCH HÀNG (phân khúc RFM) ==");
  L.push(
    `- VIP: ${c.segments.champion}, Trung thành: ${c.segments.loyal}, Mới: ${c.segments.new}, ` +
      `Nguy cơ rời bỏ: ${c.segments.at_risk}, Đang ngủ: ${c.segments.hibernating}, Khác: ${c.segments.others}.`,
  );
  if (c.churnTop.length) {
    L.push(`- Khách nguy cơ rời bỏ (giá trị cao, lâu chưa quay lại):`);
    for (const k of c.churnTop) L.push(`  • ${k.name}: đã chi ${vnd(k.monetary)}, vắng ${k.recencyDays} ngày.`);
  }
  L.push("");
  L.push("== KHÁCH THAM KHẢO (leads) ==");
  L.push(`- Tổng: ${c.leads.total}, đang theo đuổi: ${c.leads.open}, đã chuyển khách: ${c.leads.converted}, tỉ lệ chuyển đổi: ${c.leads.conversionRate}%.`);
  L.push("");
  L.push("== KHO VẬT TƯ ==");
  if (c.lowStock.length) {
    L.push("- Vật tư dưới mức tồn tối thiểu:");
    for (const m of c.lowStock) L.push(`  • ${m.name}: còn ${m.stock} ${m.unit} (tối thiểu ${m.minStock}).`);
  } else {
    L.push("- Không có vật tư dưới mức tồn tối thiểu.");
  }
  L.push("");
  L.push("== MARKETING ==");
  L.push(
    `- Chi phí marketing: ${vnd(c.marketing.spend)}; doanh thu từ khách nguồn marketing: ${vnd(c.marketing.revenue)}; ` +
      `ROI: ${c.marketing.roi == null ? "chưa tính được (chưa ghi chi phí)" : `${c.marketing.roi.toFixed(1)} lần`}.`,
  );
  return L.join("\n");
}

export const ASSISTANT_SYSTEM =
  "Bạn là trợ lý phân tích vận hành cho một trung tâm phẫu thuật thẩm mỹ. " +
  "Người dùng là quản lý/chủ phòng khám. Hãy trả lời NGẮN GỌN bằng tiếng Việt, " +
  "CHỈ dựa trên phần DỮ LIỆU được cung cấp bên dưới. Tuyệt đối KHÔNG bịa số liệu. " +
  "Nếu câu hỏi vượt ngoài dữ liệu có sẵn, hãy nói thẳng là chưa có dữ liệu đó và " +
  "gợi ý trang/chỗ trong app có thể xem (vd: Sổ công nợ, Phân tích kinh doanh, Kho). " +
  "Khi nêu số tiền, dùng đơn vị đồng (đ). Có thể trình bày gạch đầu dòng cho dễ đọc. " +
  "Không đưa lời khuyên y khoa.";

/** Câu hỏi gợi ý hiển thị sẵn cho người dùng bấm nhanh. */
export const SUGGESTED_QUESTIONS = [
  "Doanh thu 30 ngày qua bao nhiêu?",
  "Khách nào đang nợ nhiều nhất?",
  "Dịch vụ nào bán chạy nhất?",
  "Có bao nhiêu khách nguy cơ rời bỏ, nên làm gì?",
  "Vật tư nào sắp hết cần nhập thêm?",
  "Tình hình khách tham khảo và tỉ lệ chuyển đổi ra sao?",
];
