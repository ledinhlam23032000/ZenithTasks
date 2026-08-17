/**
 * Logic thuần của Lương tách khỏi `lib/payroll.ts` (file đó import `@/lib/db` nên vitest
 * không resolve được — xem BAN-GIAO.md cạm bẫy #4) để có thể unit-test trực tiếp.
 */

/** Nhân sự hoạt động nhưng 0 ngày công trong tháng — dấu hiệu chấm công có thể chưa chốt/thiếu. */
export function missingAttendanceStaff<T extends { daysWorked: number }>(rows: T[]): T[] {
  return rows.filter((r) => r.daysWorked === 0);
}

/**
 * Lương cứng thực nhận = lương cứng × ngày công ÷ ngày công chuẩn.
 * KHÔNG kẹp trần ở 100%: đi làm nhiều hơn ngày chuẩn (vd 31/26 ngày) phải
 * được trả nhiều hơn lương cứng niêm yết, không chỉ đi làm thiếu mới bị trừ.
 */
export function computeBaseActual(baseFull: number, daysWorked: number, standardDays: number): number {
  if (standardDays <= 0) return 0;
  return Math.round(baseFull * (daysWorked / standardDays));
}
