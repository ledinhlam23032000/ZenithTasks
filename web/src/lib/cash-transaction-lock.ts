export const CASH_AUTO_LOCK_HOURS = 24;
export const CASH_AUTO_LOCK_MS = CASH_AUTO_LOCK_HOURS * 60 * 60 * 1000;

type CashDeleteInput = {
  userId: string;
  role: string;
  createdById: string | null | undefined;
  createdAt: Date | string;
  now?: Date;
};

/**
 * Khoản thu/chi tự khóa với nhân sự sau 24 giờ kể từ lúc lưu.
 * Dùng createdAt thay vì occurredAt để người dùng không thể kéo dài hạn
 * bằng cách nhập ngày phát sinh cũ/mới.
 */
export function isCashTransactionAutoLocked(createdAt: Date | string, now = new Date()): boolean {
  const created = createdAt instanceof Date ? createdAt.getTime() : new Date(createdAt).getTime();
  if (!Number.isFinite(created)) return false;
  return now.getTime() - created >= CASH_AUTO_LOCK_MS;
}

/**
 * ADMIN luôn có thể yêu cầu xóa (các khóa sổ/chứng từ liên kết vẫn do server
 * kiểm tra riêng). Nhân sự chỉ được xóa đúng khoản mình nhập trong 24 giờ.
 */
export function canDeleteCashTransaction(input: CashDeleteInput): boolean {
  if (input.role === "ADMIN") return true;
  return input.createdById === input.userId && !isCashTransactionAutoLocked(input.createdAt, input.now);
}
