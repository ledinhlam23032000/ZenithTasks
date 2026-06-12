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

export function growthPct(current: number, previous: number): number {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
