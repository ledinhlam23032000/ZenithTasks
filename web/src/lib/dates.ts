import { startOfDay, endOfDay, startOfMonth, endOfMonth, subMonths, addDays } from "date-fns";

export function todayRange(now = new Date()) {
  return { gte: startOfDay(now), lte: endOfDay(now) };
}

export function dayRange(d: Date) {
  return { gte: startOfDay(d), lte: endOfDay(d) };
}

export function tomorrowRange(now = new Date()) {
  return dayRange(addDays(now, 1));
}

export function monthRange(now = new Date()) {
  return { gte: startOfMonth(now), lte: endOfMonth(now) };
}

export function lastMonthRange(now = new Date()) {
  const d = subMonths(now, 1);
  return { gte: startOfMonth(d), lte: endOfMonth(d) };
}

/** Ngày (theo giờ VN, UTC+7) dạng mốc 00:00 UTC — dùng cho cột ngày chấm công. */
export function vnDateOnly(d = new Date()): Date {
  const vn = new Date(d.getTime() + 7 * 3600 * 1000);
  return new Date(Date.UTC(vn.getUTCFullYear(), vn.getUTCMonth(), vn.getUTCDate()));
}

export function growthPct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
