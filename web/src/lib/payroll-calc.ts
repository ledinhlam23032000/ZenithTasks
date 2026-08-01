// Tính lương cứng theo ngày công — THUẦN, không phụ thuộc DB (dễ test).

/**
 * Lương cứng thực nhận = lương cứng × ngày công ÷ ngày công chuẩn.
 * KHÔNG kẹp trần ở 100%: đi làm nhiều hơn ngày chuẩn (vd 31/26 ngày) phải
 * được trả nhiều hơn lương cứng niêm yết, không chỉ đi làm thiếu mới bị trừ.
 */
export function computeBaseActual(baseFull: number, daysWorked: number, standardDays: number): number {
  if (standardDays <= 0) return 0;
  return Math.round(baseFull * (daysWorked / standardDays));
}
