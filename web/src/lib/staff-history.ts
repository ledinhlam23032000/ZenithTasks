/** Chỉ cho phép xóa cứng tài khoản hoàn toàn chưa phát sinh dữ liệu liên quan. */
export function hasStaffHistory(counts: Record<string, number>): boolean {
  return Object.values(counts).some((count) => count > 0);
}
