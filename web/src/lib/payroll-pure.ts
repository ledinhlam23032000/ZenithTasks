/**
 * Logic thuần của Lương tách khỏi `lib/payroll.ts` (file đó import `@/lib/db` nên vitest
 * không resolve được — xem BAN-GIAO.md cạm bẫy #4) để có thể unit-test trực tiếp.
 */

/** Nhân sự hoạt động nhưng 0 ngày công trong tháng — dấu hiệu chấm công có thể chưa chốt/thiếu. */
export function missingAttendanceStaff<T extends { daysWorked: number }>(rows: T[]): T[] {
  return rows.filter((r) => r.daysWorked === 0);
}
