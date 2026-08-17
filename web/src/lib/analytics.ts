// ============================================================================
// PHÂN TÍCH KINH DOANH (Nhóm C — BI) — toán THUẦN, không phụ thuộc DB (có test).
//
// Gồm 2 nhóm hàm:
//   • RFM: chấm điểm khách theo Recency (lâu/gần đây), Frequency (số lần), Monetary
//     (tổng chi) → phân khúc (VIP / Trung thành / Mới / Nguy cơ rời bỏ / Đang ngủ).
//   • Phễu chuyển đổi: từ danh sách bậc (mỗi bậc 1 con số) → tỉ lệ so với bậc đầu &
//     so với bậc liền trước.
//
// Ngưỡng RFM là THAM SỐ (DEFAULT_RFM) để chủ dễ tinh chỉnh sau này.
// ============================================================================

export type RfmThresholds = {
  // recency (ngày kể từ lần gần nhất): ≤ a → điểm 3 (gần đây); ≤ b → 2; còn lại → 1.
  recency: [number, number];
  // frequency (số hồ sơ): ≥ b → 3; ≥ a → 2; còn lại → 1.
  frequency: [number, number];
  // monetary (tổng đã chi, VND): ≥ b → 3; ≥ a → 2; còn lại → 1.
  monetary: [number, number];
};

export const DEFAULT_RFM: RfmThresholds = {
  recency: [30, 90],
  frequency: [2, 3],
  monetary: [5_000_000, 20_000_000],
};

export type Score = 1 | 2 | 3;
export type RfmScore = { r: Score; f: Score; m: Score };

export function rfmScore(
  input: { recencyDays: number; frequency: number; monetary: number },
  t: RfmThresholds = DEFAULT_RFM,
): RfmScore {
  const r: Score = input.recencyDays <= t.recency[0] ? 3 : input.recencyDays <= t.recency[1] ? 2 : 1;
  const f: Score = input.frequency >= t.frequency[1] ? 3 : input.frequency >= t.frequency[0] ? 2 : 1;
  const m: Score = input.monetary >= t.monetary[1] ? 3 : input.monetary >= t.monetary[0] ? 2 : 1;
  return { r, f, m };
}

export type Segment = "champion" | "loyal" | "new" | "at_risk" | "hibernating" | "others";

// Thứ tự hiển thị các phân khúc (từ giá trị cao → cần chú ý).
export const SEGMENTS: Segment[] = ["champion", "loyal", "new", "at_risk", "hibernating", "others"];

/**
 * Quy điểm RFM về 1 phân khúc. Quy tắc (ưu tiên từ trên xuống):
 *   • r=1 (lâu chưa quay lại): nếu từng giá trị cao (f+m ≥ 4) → "at_risk" (nguy cơ rời
 *     bỏ — cần kéo lại); ngược lại "hibernating" (đang ngủ, giá trị thấp).
 *   • r=3 & f+m ≥ 5: "champion" (VIP — gần đây + chi nhiều/thường xuyên).
 *   • f ≥ 2 (r đang 2–3): "loyal" (trung thành — quay lại nhiều lần).
 *   • r=3, f=1: "new" (khách mới đến gần đây).
 *   • còn lại (r=2, f=1): "others" (tiềm năng/chưa rõ nhóm).
 */
export function rfmSegment(s: RfmScore): Segment {
  const fm = s.f + s.m;
  if (s.r === 1) return fm >= 4 ? "at_risk" : "hibernating";
  if (s.r === 3 && fm >= 5) return "champion";
  if (s.f >= 2) return "loyal";
  if (s.r === 3) return "new";
  return "others";
}

/** Khách thuộc nhóm "cần chủ động kéo lại" (radar khách rời bỏ). */
export function isChurnRisk(seg: Segment): boolean {
  return seg === "at_risk";
}

export type FunnelInput = { label: string; count: number };
export type FunnelStep = { label: string; count: number; pctOfTop: number; pctOfPrev: number };

/** Tỉ lệ chuyển đổi từng bậc: so với bậc đầu (pctOfTop) & bậc liền trước (pctOfPrev). */
export function funnelRates(steps: FunnelInput[]): FunnelStep[] {
  const top = steps[0]?.count ?? 0;
  return steps.map((s, i) => {
    const prev = i === 0 ? s.count : steps[i - 1].count;
    return {
      label: s.label,
      count: s.count,
      pctOfTop: top > 0 ? round1((s.count / top) * 100) : 0,
      pctOfPrev: prev > 0 ? round1((s.count / prev) * 100) : 0,
    };
  });
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * ROI marketing = doanh thu (từ khách nguồn marketing) / chi phí marketing. Trả số lần
 * (vd 3.2 nghĩa là 1đ chi marketing thu về 3.2đ). null nếu CHƯA có chi phí (không chia 0).
 */
export function marketingRoi(revenue: number, spend: number): number | null {
  return spend > 0 ? round1(revenue / spend) : null;
}
