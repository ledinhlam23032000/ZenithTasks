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

/**
 * Giải thích các cơ chế nghiệp vụ THẬT đang chạy trong app (giá dịch vụ, lương,
 * công nợ, hạng thành viên, Lãi/Lỗ...) — viết bằng ngôn ngữ kinh doanh, không
 * thuật ngữ kỹ thuật. Đưa cho AI làm nguồn tham chiếu KHI GIẢI THÍCH CƠ CHẾ,
 * tách biệt với `formatAssistantContext()` (số liệu thời điểm hiện tại).
 * ⚠️ Phải khớp với logic THẬT — sửa công thức ở đâu thì cập nhật đoạn tương ứng
 * ở đây (xem BAN-GIAO.md mục 7 "Logic nghiệp vụ cốt lõi" để đối chiếu).
 */
export const BUSINESS_RULES_KNOWLEDGE = `
== TIỀN HỒ SƠ ĐIỀU TRỊ ==
- Mỗi dịch vụ trong hồ sơ: Thành tiền dòng = Giá ưu đãi × Số lượng − Giảm giá riêng dòng đó.
- Tổng hồ sơ (trước voucher) = cộng Thành tiền của mọi dòng dịch vụ.
- Voucher (nếu có) trừ tiếp vào tổng, không được vượt quá tổng đó.
- Thành tiền cuối cùng của hồ sơ = Tổng trước voucher − Voucher.
- Đã trả = cộng mọi khoản thu đã ghi nhận cho hồ sơ đó.
- Còn nợ = Thành tiền cuối cùng − Đã trả (không bao giờ âm; trả dư không tính "nợ âm").
- Hoa hồng tự động tính theo tiền khách đã thanh toán thật từng Payment trong kỳ và phân bổ cho đúng người/vai trò; phần điều chỉnh thủ công nhập riêng ở commissionOverride, không nhập lại số tự động.

== HẠNG THÀNH VIÊN & ĐIỂM TÍCH LŨY ==
- Tính theo TỔNG CHI TIÊU THỰC trọn đời của khách (tiền đã thanh toán thật, không tính phần còn nợ).
- Bậc: Thành viên (0đ, không ưu đãi) → Bạc (từ 10 triệu, ưu đãi 3%) → Vàng (từ 30 triệu, ưu đãi 5%) → Kim cương (từ 80 triệu, ưu đãi 10%).
- Điểm tích lũy = Tổng chi tiêu thực ÷ 100.000đ (làm tròn xuống).

== CÔNG NỢ ==
- Sổ công nợ liệt kê mọi hồ sơ còn nợ > 0, xếp theo số tiền nợ giảm dần.
- Tuổi nợ tính từ ngày mở hồ sơ tới hôm nay, chia 4 nhóm: 0–15 ngày, 15–30 ngày, 30–60 ngày, trên 60 ngày.
- "Đã thu nợ tháng này" = tiền thu được trong tháng nhưng từ hồ sơ đã mở TRƯỚC tháng đó (phân biệt với doanh thu ca mới trong tháng).
- Hẹn nợ (trả góp): mỗi hồ sơ có thể đặt 1 kế hoạch — ngày trả hằng tháng + số tiền mỗi kỳ; hệ thống tự nhắc kỳ tiếp theo, không tự trừ tiền.

== LƯƠNG & HOA HỒNG NHÂN SỰ ==
- Lương cứng = Lương cơ bản × (Số ngày công thực tế ÷ Số ngày công chuẩn, mặc định 26 ngày/tháng).
- Hoa hồng tự động tính theo tiền khách đã thanh toán thật từng Payment trong kỳ; khách trả góp đến đâu thì tháng đó tính đến đó.
- commissionOverride là phần điều chỉnh hoa hồng thủ công ngoài công thức; không nhập lại hoa hồng tự động vì sẽ cộng đôi.
- "Giá trị chốt" là tổng hồ sơ/dịch vụ, có thể gồm phần còn nợ; không dùng làm căn cứ chi hoa hồng.
- "Thực thu" là tiền thật theo ngày thanh toán, tách thu ca mới và thu nợ ca cũ. Nếu hồ sơ có phân bổ phối hợp, hệ thống chia theo tỷ lệ cấu hình; doanh thu trung tâm vẫn chỉ đếm mỗi Payment một lần.
- Bảng lương cuối tháng có thể xuất Excel/Word; giấy đề nghị thanh toán được lập, duyệt và in trước khi ghi sổ chi.
- Sổ tư vấn điện tử lưu hành chính, sinh hiệu, sàng lọc, mong muốn, hiện trạng, kết quả dự tính và chỉ định; có nút sàng lọc nhanh nhưng không thay cho đánh giá chuyên môn.

== SỔ THU CHI & KẾ TOÁN (LÃI/LỖ) ==
- Sổ thu chi ghi dòng tiền vận hành hằng ngày (thu/chi tay), KHÔNG hiện doanh thu hay lãi lỗ trực tiếp.
- Trang Kế toán gộp 3 nguồn số liệu thành 1 bảng kết quả kinh doanh mỗi tháng, để tránh phải cộng tay và tính trùng:
  Lãi/Lỗ = (Doanh thu dịch vụ, tính theo tiền THẬT đã thu — không tính phần còn nợ) + Thu khác − Chi vận hành − Lương − Hoa hồng cộng tác viên.
- Lương & hoa hồng cộng tác viên trong Lãi/Lỗ LUÔN lấy từ bảng Lương/CTV (không lấy từ Sổ thu chi trực tiếp), tránh bị cộng 2 lần khi đã ghi phiếu chi lương.
- Có thể "Chốt sổ" 1 tháng để khoá không cho sửa số liệu tháng đó nữa (chỉ ADMIN chốt/mở lại).

== PHÂN QUYỀN CƠ BẢN ==
- ADMIN và MANAGER thấy đầy đủ số liệu kinh doanh (trừ vài khu vực chỉ ADMIN như Kế toán chi lương, Phân quyền).
- CỔ ĐÔNG (SHAREHOLDER) chỉ được XEM số liệu kinh doanh tổng quan, không sửa/xóa được gì, không xem số điện thoại đầy đủ của khách, không xem chi tiết lương từng nhân sự.
- Tư vấn viên/bác sĩ thường chỉ thấy hồ sơ/công nợ của khách MÌNH phụ trách, không thấy của người khác.

== BẢN ĐỒ VẬN HÀNH HỆ THỐNG ==
- Tổng quan/Dashboard: theo dõi việc hôm nay, lịch hẹn, tin chưa đọc, cảnh báo tài chính và các chỉ số vận hành.
- Hồ sơ khách hàng/Hồ sơ điều trị: thông tin khách, dịch vụ, Payment, công nợ, ảnh, sổ tư vấn, phiếu đồng ý và tài liệu hồ sơ.
- Chăm sóc KH/Hộp thư: hội thoại Facebook Messenger và Zalo OA, nguồn Page/OA, phân công, trả lời, SLA, follow-up và timeline khách hàng.
- Phân tích/Báo cáo: doanh thu thực thu, phễu khách, RFM, nguy cơ rời bỏ, LTV, ROI marketing và các cảnh báo lệch dữ liệu.
- Lương & hoa hồng: chấm công, lương cứng, hoa hồng theo Payment thực thu, commissionOverride, thưởng/điều chỉnh, bảng lương và phụ lục hoa hồng.
- Thu–chi: sổ dòng tiền thực tế, gồm thu khác và chi vận hành; không tự coi một dòng chi lương đã có trong bảng lương là chi lương thêm lần nữa trong Lãi/Lỗ.
- Kế toán: kết quả kinh doanh theo tháng, đối chiếu thực thu, chi theo hạng mục, trạng thái chi lương/CTV, công nợ, chốt/mở sổ và trung tâm chứng từ.
- Đề nghị thanh toán: mọi khoản chi, kể cả khoản nhỏ như gói tăm 3.000đ, có thể lập phiếu; trạng thái đi qua chờ duyệt → đã duyệt → đã thanh toán. Khi đã thanh toán, hệ thống tạo đúng một CashTransaction EXPENSE và liên kết ngược với phiếu.
- Kho/Danh mục: dịch vụ, vật tư, giá vốn, tồn kho, BOM và cảnh báo dưới mức tối thiểu.
- Nhân sự/Phân quyền/Nhật ký/Tình trạng hệ thống: người dùng, vai trò, quyền, audit, backup và trạng thái vận hành.

== QUY TẮC CHỨNG TỪ ==
- PaymentRequest là chứng từ gốc; CashTransaction là dòng tiền đã phát sinh. Không tạo CashTransaction khi phiếu còn PENDING hoặc REJECTED.
- Chỉ ADMIN được duyệt, ghi sổ thanh toán, chi lương/hoa hồng hoặc chốt/mở sổ theo quyền hiện tại. Người khác có thể lập đề nghị nếu được cấp quyền nhưng không được tự làm phiếu thành PAID.
- Một PaymentRequest chỉ được liên kết tối đa một CashTransaction. Dòng CashTransaction đã liên kết không được sửa/xóa trực tiếp từ Sổ thu–chi; phải xử lý từ chứng từ gốc để tránh lệch sổ.
- Bảng lương và hoa hồng cộng tác viên có thể sinh PaymentRequest/CashTransaction liên kết; không cộng lại dòng chi đó vào chi phí lương/hoa hồng lần thứ hai.
- Khi trả lời về hồ sơ cụ thể, tiền cụ thể, bảng lương cụ thể hoặc chứng từ cụ thể, phải dùng tool đọc tương ứng hoặc nói rõ chưa có dữ liệu; không suy đoán từ kiến thức tổng quát.
`.trim();

export const ASSISTANT_SYSTEM =
  "Bạn là trợ lý quản trị nội bộ của Trung tâm Phẫu thuật Tạo hình Thẩm mỹ — Bệnh viện Đa khoa Hồng Phúc. " +
  "Nếu người dùng là ADMIN, hãy hành xử như trợ lý điều hành: nắm bản đồ module, quy tắc nghiệp vụ, chứng từ và dữ liệu hiện tại; không trả lời chung chung khi đã có nguồn dữ liệu hoặc quy tắc phù hợp. " +
  "Người dùng là quản lý/chủ phòng khám. Hãy trả lời NGẮN GỌN bằng tiếng Việt. " +
  "Bạn được cung cấp 3 nguồn: (1) QUY TẮC NGHIỆP VỤ — cách các cơ chế trong app hoạt động thật " +
  "(giá dịch vụ, lương, công nợ, hạng thành viên, Lãi/Lỗ...), dùng để GIẢI THÍCH CƠ CHẾ khi được hỏi " +
  "\"tính sao\"/\"cơ chế thế nào\"; (2) DỮ LIỆU — số liệu tổng hợp tại thời điểm hiện tại, dùng để TRẢ LỜI " +
  "SỐ CỤ THỂ. Tuyệt đối KHÔNG bịa số liệu hay bịa quy tắc ngoài 3 nguồn này. " +
  "Nguồn thứ ba là BẢN ĐỒ VẬN HÀNH HỆ THỐNG trong kho kiến thức: dùng để hướng dẫn anh đi đúng module, hiểu trạng thái chứng từ và mô tả luồng xử lý. " +
  "Nếu câu hỏi vượt ngoài cả 3 nguồn (vd hỏi về 1 khách/hồ sơ cụ thể không có trong DỮ LIỆU), hãy nói thẳng " +
  "là chưa có dữ liệu đó và gợi ý trang/chỗ trong app có thể xem (vd: Sổ công nợ, Phân tích kinh doanh, Kho). " +
  "Nếu người dùng đang YÊU CẦU THAY ĐỔI cách hệ thống hoạt động (vd \"đổi cách tính hoa hồng thành...\", " +
  "\"thêm ngưỡng mới cho...\") thay vì hỏi thông tin, hãy giải thích ngắn gọn bạn không tự sửa hệ thống được, " +
  "và gợi ý họ bấm nút \"Ghi thành yêu cầu cho lập trình\" bên dưới câu trả lời để lưu lại yêu cầu đó. " +
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
  "Lương cứng của nhân viên tính như thế nào?",
  "Hạng thành viên khách hàng tính theo tiêu chí gì?",
];
