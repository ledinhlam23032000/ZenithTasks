// ============================================================================
// TÍNH HOA HỒNG NHÂN SỰ — toán THUẦN, có test. Theo đúng "Cơ chế lương nhân sự
// Trung Tâm" (văn bản chủ cung cấp, PTTM BV Hồng Phúc):
//   - Bác sĩ: lương cứng + 8% tiền dịch vụ (ca mình thực hiện) + tiền tư vấn
//     (0% khách MỚI, 10% khách CŨ — "cũ" nghĩa là khách đã từng làm ca VỚI
//     ĐÚNG bác sĩ đó trước đây, không phải khách cũ nói chung).
//   - Điều dưỡng: lương cứng + 100k/ca dịch vụ mình phụ trách + 4% tiền tư vấn
//     khi được giao làm tư vấn viên cho 1 hồ sơ.
//   - Tư vấn viên: lương cứng + % theo BẬC doanh số tích lũy trong tháng, tính
//     TRỌN GÓI theo bậc đạt được (không luỹ tiến từng bậc như thuế TNCN) —
//     bậc khách MỚI và bậc khách CŨ tách riêng, mỗi bậc áp dụng cho TOÀN BỘ
//     doanh số thuộc bậc đó. "Khách cũ" cũng dùng ĐÚNG định nghĩa quan hệ ở
//     trên: đã từng làm ca VỚI ĐÚNG tư vấn viên đó.
//   - Thưởng nóng: KHÔNG có công thức (tuỳ chiến dịch/Bill) — vẫn nhập tay ở
//     PayrollEntry.bonus như cũ, module này không đụng tới.
//
// GIẢ ĐỊNH cần lưu ý (chưa có căn cứ rõ trong văn bản, chọn theo triết lý sẵn
// có của app — "hoa hồng tính trên thực thu" — nhưng ở đây dùng GIÁ TRỊ CHỐT
// vì văn bản mô tả "doanh số" theo khung BẬC kiểu mục tiêu bán hàng, không
// phải dòng tiền — nếu chủ muốn đổi sang thực thu, sửa ở lib/commission-data.ts
// nơi gom `newRevenue`/`returningRevenue`, KHÔNG cần sửa file này):
//   - "Khách có cọc lại tiền" (1 nhánh trong định nghĩa khách mới của văn bản)
//     KHÔNG tự nhận diện được — app chưa có khái niệm "cọc lại" tách biệt.
//   - "Không tính khách bảo hành" cho khách cũ tư vấn viên KHÔNG tự loại được
//     — app chưa có cờ đánh dấu ca bảo hành/làm lại miễn phí.
// ============================================================================

export const LUNCH_ALLOWANCE_PER_DAY = 25_000;

export const DOCTOR_SERVICE_RATE = 0.08;
export const DOCTOR_CONSULT_RETURNING_RATE = 0.1; // khách mới = 0%, không cần hằng số riêng

export const NURSE_SERVICE_FEE_PER_CASE = 100_000;
export const NURSE_CONSULT_RATE = 0.04;

export type CommissionBracket = { min: number; rate: number };

/** Khách MỚI (chưa từng làm ca với tư vấn viên đó): <500tr=3%, 500-800tr=4%, ≥800tr=5%. */
export const CONSULTANT_NEW_BRACKETS: CommissionBracket[] = [
  { min: 0, rate: 0.03 },
  { min: 500_000_000, rate: 0.04 },
  { min: 800_000_000, rate: 0.05 },
];

/** Khách CŨ (đã từng làm ca với ĐÚNG tư vấn viên đó): <200tr=4%, 200-500tr=5%, ≥500tr=6%. */
export const CONSULTANT_RETURNING_BRACKETS: CommissionBracket[] = [
  { min: 0, rate: 0.04 },
  { min: 200_000_000, rate: 0.05 },
  { min: 500_000_000, rate: 0.06 },
];

/** Phụ cấp cơm trưa — áp dụng chung mọi vai trò, theo đúng ngày công thực tế. */
export function lunchAllowance(daysWorked: number): number {
  return Math.max(0, daysWorked) * LUNCH_ALLOWANCE_PER_DAY;
}

/** 8% giá trị dịch vụ bác sĩ trực tiếp thực hiện trong tháng. */
export function doctorServiceCommission(serviceRevenue: number): number {
  return Math.round(Math.max(0, serviceRevenue) * DOCTOR_SERVICE_RATE);
}

/** 10% giá trị ca tư vấn cho khách CŨ (khách mới = 0đ, không cộng vào đây). */
export function doctorConsultCommission(returningCustomerRevenue: number): number {
  return Math.round(Math.max(0, returningCustomerRevenue) * DOCTOR_CONSULT_RETURNING_RATE);
}

/** 100.000đ / ca dịch vụ điều dưỡng phụ trách trong tháng. */
export function nurseServiceFee(caseCount: number): number {
  return Math.max(0, caseCount) * NURSE_SERVICE_FEE_PER_CASE;
}

/** 4% giá trị ca điều dưỡng được giao làm tư vấn viên. */
export function nurseConsultCommission(consultRevenue: number): number {
  return Math.round(Math.max(0, consultRevenue) * NURSE_CONSULT_RATE);
}

/** Bậc áp dụng cho 1 mức doanh số — bậc CAO NHẤT mà doanh số đạt tới. */
export function bracketRate(amount: number, brackets: CommissionBracket[]): number {
  let rate = brackets[0]?.rate ?? 0;
  for (const b of brackets) if (amount >= b.min) rate = b.rate;
  return rate;
}

export type ConsultantCommissionResult = {
  newRevenue: number;
  newRate: number;
  newCommission: number;
  returningRevenue: number;
  returningRate: number;
  returningCommission: number;
  total: number;
};

/** Hoa hồng tư vấn viên: bậc TRỌN GÓI, tách riêng khách mới / khách cũ. */
export function consultantCommission(newRevenue: number, returningRevenue: number): ConsultantCommissionResult {
  const nRev = Math.max(0, newRevenue);
  const rRev = Math.max(0, returningRevenue);
  const newRate = bracketRate(nRev, CONSULTANT_NEW_BRACKETS);
  const returningRate = bracketRate(rRev, CONSULTANT_RETURNING_BRACKETS);
  const newCommission = Math.round(nRev * newRate);
  const returningCommission = Math.round(rRev * returningRate);
  return {
    newRevenue: nRev,
    newRate,
    newCommission,
    returningRevenue: rRev,
    returningRate,
    returningCommission,
    total: newCommission + returningCommission,
  };
}

export type CommissionBreakdownInput = {
  /** Lương cứng thực nhận theo ngày công — dùng lại payroll-pure.ts computeBaseActual(), KHÔNG tính lại ở đây để tránh 2 công thức lệch nhau. */
  attendanceWage: number;
  daysWorked: number;
  doctorServiceRevenue?: number;
  doctorReturningConsultRevenue?: number;
  nurseCaseCount?: number;
  nurseConsultRevenue?: number;
  consultantNewRevenue?: number;
  consultantReturningRevenue?: number;
};

export type CommissionBreakdown = {
  attendanceWage: number;
  lunchAllowance: number;
  doctorService: number;
  doctorConsult: number;
  nurseService: number;
  nurseConsult: number;
  consultant: ConsultantCommissionResult;
  /** Tổng mọi khoản hoa hồng/phụ (KHÔNG gồm lương theo công) — dùng gợi ý cho PayrollEntry.commission. */
  totalCommission: number;
  /** Tổng cộng hưởng lương (lương theo công + phụ cấp + mọi hoa hồng). Không gồm Thưởng nóng — nhập tay riêng. */
  total: number;
};

/**
 * Tính trọn bộ breakdown cho 1 nhân sự/1 tháng. Không cần biết vai trò —
 * chỗ nào không áp dụng cho vai trò đó thì lớp thu thập dữ liệu (xem
 * lib/commission-data.ts) chỉ đơn giản không đưa số liệu vào (mặc định 0).
 */
export function computeCommissionBreakdown(input: CommissionBreakdownInput): CommissionBreakdown {
  const wage = input.attendanceWage;
  const lunch = lunchAllowance(input.daysWorked);
  const doctorService = doctorServiceCommission(input.doctorServiceRevenue ?? 0);
  const doctorConsult = doctorConsultCommission(input.doctorReturningConsultRevenue ?? 0);
  const nurseService = nurseServiceFee(input.nurseCaseCount ?? 0);
  const nurseConsult = nurseConsultCommission(input.nurseConsultRevenue ?? 0);
  const consultant = consultantCommission(input.consultantNewRevenue ?? 0, input.consultantReturningRevenue ?? 0);
  const totalCommission = doctorService + doctorConsult + nurseService + nurseConsult + consultant.total;
  return {
    attendanceWage: wage,
    lunchAllowance: lunch,
    doctorService,
    doctorConsult,
    nurseService,
    nurseConsult,
    consultant,
    totalCommission,
    total: wage + lunch + totalCommission,
  };
}

/**
 * Phân bổ MỘT khoản thực thu cho các dòng dịch vụ CÓ gắn bác sĩ.
 *
 * Vì sao tồn tại: bản cũ trong `commission-data.ts` lấy tử số là toàn bộ `paid`
 * nhưng mẫu số chỉ là tổng các dòng CÓ bác sĩ, nên tổng phân bổ luôn bằng đúng
 * `paid` — phần dịch vụ KHÔNG gắn bác sĩ bị hút hết sang bác sĩ. Hồ sơ 10tr gồm
 * 6tr của bác sĩ A và 4tr không gắn ai, khách trả đủ 10tr thì A nhận căn cứ 10tr
 * (hoa hồng 800k) thay vì 6tr (480k) — trả dư 320k mỗi hồ sơ dạng này.
 *
 * Mẫu số đúng phải là tổng giá trị TOÀN BỘ dịch vụ của hồ sơ.
 *
 * @param paid                    số tiền của khoản thực thu đang xét (đã làm tròn, >= 0)
 * @param rows                    các dòng dịch vụ có bác sĩ: { doctorId, revenue }
 * @param totalCaseServiceRevenue tổng giá trị MỌI dòng dịch vụ của hồ sơ
 */
export function allocateDoctorServiceBase(
  paid: number,
  rows: readonly { doctorId: string; revenue: number }[],
  totalCaseServiceRevenue: number,
): Array<{ doctorId: string; base: number }> {
  if (paid <= 0 || rows.length === 0 || totalCaseServiceRevenue <= 0) return [];
  const doctorTotal = rows.reduce((sum, r) => sum + Math.max(0, r.revenue), 0);
  if (doctorTotal <= 0) return [];

  // Phần thực thu quy về các dịch vụ có bác sĩ. Kẹp <= paid phòng dữ liệu lệch
  // (vd tổng dòng dịch vụ lớn hơn tổng hồ sơ do sửa tay).
  const doctorBase = Math.min(paid, Math.round((paid * doctorTotal) / totalCaseServiceRevenue));

  let assigned = 0;
  return rows.map((row, index) => {
    // Dòng cuối nhận phần dư để tổng khớp đúng doctorBase (không phải paid).
    const base = index === rows.length - 1
      ? Math.max(0, doctorBase - assigned)
      : Math.floor((doctorBase * Math.max(0, row.revenue)) / doctorTotal);
    assigned += base;
    return { doctorId: row.doctorId, base };
  });
}
