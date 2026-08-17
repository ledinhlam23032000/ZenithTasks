// ============================================================================
// CHỐNG TRÙNG LỊCH HẸN (B4) — toán THUẦN, không phụ thuộc DB (có test ở __tests__).
//
// Lịch hẹn KHÔNG có thời lượng (chỉ có 1 mốc giờ). Coi là "trùng" nếu 2 lịch của
// CÙNG một người phụ trách (tư vấn/bác sĩ) cách nhau dưới `windowMin` phút — vì 1
// người không thể tiếp 2 khách cùng lúc. Ngưỡng mặc định 30 phút (tinh chỉnh được).
// ============================================================================

export const SLOT_WINDOW_MIN = 30;

export type ApptSlot = { id: string; scheduledAt: Date; label?: string };

/** Hai mốc giờ có "đụng" nhau trong cửa sổ windowMin phút không? */
export function slotConflict(aMs: number, bMs: number, windowMin: number = SLOT_WINDOW_MIN): boolean {
  return Math.abs(aMs - bMs) < windowMin * 60_000;
}

/**
 * Tìm các lịch trùng với mốc giờ `targetMs` trong danh sách `others` (đã lọc sẵn
 * theo cùng người phụ trách + trạng thái còn hiệu lực). Bỏ qua lịch có cùng `excludeId`
 * (khi đang SỬA chính lịch đó). Trả về danh sách trùng, gần nhất xếp trước.
 */
export function findConflicts(
  targetMs: number,
  others: ApptSlot[],
  windowMin: number = SLOT_WINDOW_MIN,
  excludeId?: string,
): ApptSlot[] {
  return others
    .filter((o) => o.id !== excludeId && slotConflict(targetMs, o.scheduledAt.getTime(), windowMin))
    .sort((a, b) => Math.abs(targetMs - a.scheduledAt.getTime()) - Math.abs(targetMs - b.scheduledAt.getTime()));
}

/** Số phút lệch giữa 2 mốc (làm tròn, không âm) — để hiển thị "cách N phút". */
export function minutesApart(aMs: number, bMs: number): number {
  return Math.round(Math.abs(aMs - bMs) / 60_000);
}
