export const CASE_AUTO_LOCK_HOURS = 24;
export const CASE_AUTO_LOCK_MS = CASE_AUTO_LOCK_HOURS * 60 * 60 * 1000;

/**
 * Hồ sơ tự chuyển sang trạng thái chỉ-đọc cho nhân viên sau 24 giờ kể từ
 * lần cập nhật cuối của CaseRecord. ADMIN vẫn có thể mở/sửa theo quyền.
 */
export function isCaseAutoLocked(updatedAt: Date | string, now = new Date()): boolean {
  const updated = updatedAt instanceof Date ? updatedAt.getTime() : new Date(updatedAt).getTime();
  if (!Number.isFinite(updated)) return false;
  return now.getTime() - updated >= CASE_AUTO_LOCK_MS;
}
