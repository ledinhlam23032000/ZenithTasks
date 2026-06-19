import type { Tone } from "@/components/ui/badge";

// ============================================================================
// THẺ THÀNH VIÊN & TÍCH ĐIỂM
// Hạng và điểm được TÍNH TỪ TỔNG CHI TIÊU THỰC (tiền đã thanh toán) — luôn chính
// xác, không lệch khi sửa/xóa. (Đổi điểm/redeem có thể bổ sung sau bằng sổ điểm.)
// ============================================================================

export const POINT_UNIT = 100_000; // 1 điểm cho mỗi 100.000đ đã chi tiêu

export type Tier = { key: string; label: string; min: number; tone: Tone; discount: number };

// Sắp xếp tăng dần theo ngưỡng chi tiêu (VND).
export const TIERS: Tier[] = [
  { key: "MEMBER", label: "Thành viên", min: 0, tone: "slate", discount: 0 },
  { key: "SILVER", label: "Bạc", min: 10_000_000, tone: "blue", discount: 3 },
  { key: "GOLD", label: "Vàng", min: 30_000_000, tone: "amber", discount: 5 },
  { key: "DIAMOND", label: "Kim cương", min: 80_000_000, tone: "purple", discount: 10 },
];

/** Hạng hiện tại theo tổng chi tiêu. */
export function tierFor(lifetimeSpend: number): Tier {
  let t = TIERS[0];
  for (const x of TIERS) if (lifetimeSpend >= x.min) t = x;
  return t;
}

/** Hạng kế tiếp (để hiển thị "còn bao nhiêu để lên hạng"); null nếu đã cao nhất. */
export function nextTier(lifetimeSpend: number): Tier | null {
  return TIERS.find((x) => x.min > lifetimeSpend) ?? null;
}

/** Điểm tích lũy = tổng chi tiêu / đơn vị điểm. */
export function pointsFor(lifetimeSpend: number): number {
  return Math.floor(lifetimeSpend / POINT_UNIT);
}
