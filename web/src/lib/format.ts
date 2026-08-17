import { format, formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function fmtDate(d: Date | string | number): string {
  return format(new Date(d), "dd/MM/yyyy", { locale: vi });
}

export function fmtDateTime(d: Date | string | number): string {
  return format(new Date(d), "HH:mm 'ngày' dd/MM/yyyy", { locale: vi });
}

export function fmtTime(d: Date | string | number): string {
  return format(new Date(d), "HH:mm", { locale: vi });
}

export function fmtDayLabel(d: Date | string | number): string {
  return format(new Date(d), "EEEE, dd/MM/yyyy", { locale: vi });
}

export function fmtRelative(d: Date | string | number): string {
  return formatDistanceToNow(new Date(d), { locale: vi, addSuffix: true });
}

/** Định dạng cho input type=datetime-local (yyyy-MM-ddTHH:mm). */
export function toDatetimeLocal(d: Date | string | number): string {
  return format(new Date(d), "yyyy-MM-dd'T'HH:mm");
}

/** Tên gọi ngắn (từ cuối họ tên) — dùng cho lời chào cá nhân hoá. */
export function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  return parts[parts.length - 1];
}
