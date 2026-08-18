export type AttendanceStaffCandidate = { id: string; fullName: string };

export type AttendanceIntent = {
  staffName: string;
  dates: string[];
  checkIn: string;
  checkOut: string;
  note: string;
};

export function normalizeAssistantText(s: string) {
  return s.toLocaleLowerCase("vi-VN").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

function isoDate(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function extractAttendanceDateRange(text: string, currentYear = new Date().getFullYear()): string[] {
  const found = [...text.matchAll(/(\d{1,2})\s*[\/.\-]\s*(\d{1,2})(?:\s*[\/.\-]\s*(\d{4}))?/g)];
  if (found.length < 2) return [];
  const start = { day: Number(found[0][1]), month: Number(found[0][2]), year: Number(found[0][3] ?? currentYear) };
  const end = { day: Number(found[1][1]), month: Number(found[1][2]), year: Number(found[1][3] ?? start.year) };
  const from = Date.UTC(start.year, start.month - 1, start.day);
  const to = Date.UTC(end.year, end.month - 1, end.day);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return [];
  const dates: string[] = [];
  for (let t = from; t <= to; t += 86_400_000) {
    const d = new Date(t);
    dates.push(isoDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
    if (dates.length > 62) return [];
  }
  return dates;
}

export function extractAttendanceTime(text: string, kind: "in" | "out") {
  const re = kind === "in"
    ? /(?:sang|vao|bat dau)[^\d]{0,20}(\d{1,2})(?:\s*(?:h|:)\s*(\d{2})?)/i
    : /(?:chieu|ra|ve|ket thuc)[^\d]{0,20}(\d{1,2})(?:\s*(?:h|:)\s*(\d{2})?)/i;
  const m = text.match(re);
  if (!m) return undefined;
  const hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  if (hour > 23 || minute > 59) return undefined;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

export function inferAttendanceIntent(question: string, history: string, staff: AttendanceStaffCandidate[], currentYear = new Date().getFullYear()): AttendanceIntent | null {
  const text = `${history}\n${question}`;
  const normalized = normalizeAssistantText(text);
  if (!(normalized.includes("cham cong") || normalized.includes("ngay cong") || normalized.includes("bo sung cong") || normalized.includes("di lam"))) return null;
  const target = staff.find((u) => normalized.includes(normalizeAssistantText(u.fullName)));
  const dates = extractAttendanceDateRange(normalized, currentYear);
  const checkIn = extractAttendanceTime(normalized, "in");
  const checkOut = extractAttendanceTime(normalized, "out");
  const confirmedFullAttendance = normalized.includes("chua nghi") || normalized.includes("khong nghi") || normalized.includes("di lam du") || normalized.includes("tat ca cac ngay");
  if (!target || dates.length === 0 || !checkIn || !checkOut || !confirmedFullAttendance) return null;
  return {
    staffName: target.fullName,
    dates,
    checkIn,
    checkOut,
    note: `AI chấm công theo lệnh ADMIN; đủ ngày trong khoảng ${dates[0]} đến ${dates[dates.length - 1]}.`,
  };
}
