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


export type StaffDebtAssignment = {
  consultantId: string | null;
  doctorId: string | null;
  debt: number;
};

/**
 * Công nợ là thuộc về HỒ SƠ/khách, không phải hai khoản độc lập theo vai trò.
 * Nếu một người đồng thời là consultantId và doctorId của cùng hồ sơ thì chỉ cộng
 * một lần cho người đó; hai người khác nhau vẫn nhận cùng số nợ ở góc nhìn phụ trách.
 */
export function debtByStaff(assignments: StaffDebtAssignment[]): Map<string, number> {
  const out = new Map<string, number>();
  for (const assignment of assignments) {
    if (!Number.isFinite(assignment.debt) || assignment.debt <= 0) continue;
    const staffIds = new Set([assignment.consultantId, assignment.doctorId].filter((id): id is string => Boolean(id)));
    for (const staffId of staffIds) out.set(staffId, (out.get(staffId) ?? 0) + assignment.debt);
  }
  return out;
}
