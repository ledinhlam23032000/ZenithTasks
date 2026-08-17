// ============================================================================
// THỰC THU THEO NHÂN SỰ — toán THUẦN, không I/O, dễ kiểm thử.
//
// Nghiệp vụ: doanh thu chia 2 dạng — GIÁ TRỊ CHỐT (totalAmount, gồm cả nợ) và
// THỰC THU (tiền thật đã về, theo Payment.paidAt). Khách trả nợ tháng nào thì
// tiền đó tính vào THỰC THU tháng đó của nhân sự phụ trách hồ sơ (căn cứ để
// quản lý nhập hoa hồng). Mỗi khoản thu ghi nhận cho CẢ tư vấn viên lẫn bác sĩ
// của hồ sơ (2 góc nhìn riêng, không cộng gộp với nhau).
// ============================================================================

export type PaymentAttribution = {
  amount: number;
  paidAt: Date;
  caseCreatedAt: Date; // ngày tạo hồ sơ — để biết khoản thu là "ca mới" hay "thu nợ ca cũ"
  consultantId: string | null;
  doctorId: string | null;
};

export type StaffCollection = {
  total: number; // tổng thực thu trong kỳ
  fromNew: number; // từ hồ sơ tạo TRONG kỳ
  fromDebt: number; // thu nợ từ hồ sơ tạo TRƯỚC kỳ (nợ cộng dồn các tháng trước)
};

const EMPTY: StaffCollection = { total: 0, fromNew: 0, fromDebt: 0 };

function add(map: Map<string, StaffCollection>, key: string, amount: number, isDebt: boolean) {
  const cur = map.get(key) ?? { ...EMPTY };
  cur.total += amount;
  if (isDebt) cur.fromDebt += amount;
  else cur.fromNew += amount;
  map.set(key, cur);
}

/**
 * Gom các khoản thu trong kỳ về từng nhân sự.
 * - `periodStart`: mốc đầu kỳ — hồ sơ tạo TRƯỚC mốc này thì khoản thu tính là "thu nợ ca cũ".
 * - Trả về 2 map: theo tư vấn viên và theo bác sĩ (cùng 1 khoản tiền xuất hiện ở cả 2 map).
 */
export function collectionsByStaff(
  payments: PaymentAttribution[],
  periodStart: Date,
): { consultants: Map<string, StaffCollection>; doctors: Map<string, StaffCollection> } {
  const consultants = new Map<string, StaffCollection>();
  const doctors = new Map<string, StaffCollection>();
  for (const p of payments) {
    if (p.amount <= 0) continue; // khoản âm/0 không tính căn cứ hoa hồng
    const isDebt = p.caseCreatedAt < periodStart;
    if (p.consultantId) add(consultants, p.consultantId, p.amount, isDebt);
    if (p.doctorId) add(doctors, p.doctorId, p.amount, isDebt);
  }
  return { consultants, doctors };
}

/** Tổng thực thu toàn trung tâm trong kỳ (đếm mỗi khoản đúng 1 lần, không theo nhân sự). */
export function collectionsTotal(payments: PaymentAttribution[], periodStart: Date): StaffCollection {
  const out: StaffCollection = { ...EMPTY };
  for (const p of payments) {
    if (p.amount <= 0) continue;
    out.total += p.amount;
    if (p.caseCreatedAt < periodStart) out.fromDebt += p.amount;
    else out.fromNew += p.amount;
  }
  return out;
}
