// ============================================================================
// TUỔI NỢ (B3) — toán THUẦN, không phụ thuộc DB (có test ở __tests__).
//
// "Tuổi nợ" = số ngày kể từ khi hồ sơ được tạo (createdAt) đến hiện tại.
// Chia theo 4 mốc thường dùng trong quản trị công nợ: 0-15 / 15-30 / 30-60 / 60+.
// ============================================================================

export type DebtAgingBucket = "0-15" | "15-30" | "30-60" | "60+";

export const DEBT_BUCKET_LABEL: Record<DebtAgingBucket, string> = {
  "0-15": "0–15 ngày",
  "15-30": "15–30 ngày",
  "30-60": "30–60 ngày",
  "60+": "Trên 60 ngày",
};

export const DEBT_BUCKETS: DebtAgingBucket[] = ["0-15", "15-30", "30-60", "60+"];

/** Số ngày kể từ `createdAt` đến `now` (không âm). */
export function debtAgeDays(createdAt: Date, now: Date = new Date()): number {
  const ms = now.getTime() - createdAt.getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

/** Xếp số ngày nợ vào 1 trong 4 mốc tuổi nợ. */
export function debtAgingBucket(days: number): DebtAgingBucket {
  if (days < 15) return "0-15";
  if (days < 30) return "15-30";
  if (days < 60) return "30-60";
  return "60+";
}

/** Có vượt ngưỡng cảnh báo không (nợ ≥ ngưỡng). */
export function isOverThreshold(debtAmount: number, threshold: number): boolean {
  return threshold > 0 && debtAmount >= threshold;
}
