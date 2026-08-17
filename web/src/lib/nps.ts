// ============================================================================
// NPS (Net Promoter Score) — đánh giá trải nghiệm khách. Toán THUẦN, có test.
//
// Thang 0–10: 0–6 = không hài lòng (detractor), 7–8 = bình thường (passive),
// 9–10 = hài lòng/sẽ giới thiệu (promoter). NPS = %promoter − %detractor (−100..100).
// ============================================================================

export const NPS_MIN = 0;
export const NPS_MAX = 10;

export type NpsCategory = "detractor" | "passive" | "promoter";

export const NPS_CATEGORY_LABEL: Record<NpsCategory, string> = {
  detractor: "Chưa hài lòng",
  passive: "Bình thường",
  promoter: "Hài lòng",
};

/** Chuẩn hoá điểm về 0..10 (số nguyên). */
export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(NPS_MAX, Math.max(NPS_MIN, Math.round(score)));
}

export function npsCategory(score: number): NpsCategory {
  const s = clampScore(score);
  if (s >= 9) return "promoter";
  if (s >= 7) return "passive";
  return "detractor";
}

export type NpsSummary = {
  count: number;
  score: number; // NPS = %promoter − %detractor, làm tròn (−100..100)
  promoters: number;
  passives: number;
  detractors: number;
  average: number; // điểm trung bình (0..10), 1 chữ số thập phân
};

export function npsSummary(scores: number[]): NpsSummary {
  const count = scores.length;
  if (count === 0) return { count: 0, score: 0, promoters: 0, passives: 0, detractors: 0, average: 0 };
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let sum = 0;
  for (const raw of scores) {
    const s = clampScore(raw);
    sum += s;
    const cat = npsCategory(s);
    if (cat === "promoter") promoters++;
    else if (cat === "passive") passives++;
    else detractors++;
  }
  const score = Math.round(((promoters - detractors) / count) * 100);
  const average = Math.round((sum / count) * 10) / 10;
  return { count, score, promoters, passives, detractors, average };
}
