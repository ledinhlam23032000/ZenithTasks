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
  const normalized = normalizeAssistantText(text);
  const re = kind === "in"
    ? /(?:sang|vao|bat dau)[^\d]{0,20}(\d{1,2})(?:\s*(?:h|:)\s*(\d{2})?)/i
    : /(?:chieu|ra|ve|ket thuc)[^\d]{0,20}(\d{1,2})(?:\s*(?:h|:)\s*(\d{2})?)/i;
  const m = normalized.match(re);
  if (!m) return undefined;
  const hour = Number(m[1]);
  const minute = Number(m[2] ?? 0);
  if (hour > 23 || minute > 59) return undefined;
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function extractFlexibleBoundaryTime(text: string, kind: "in" | "out") {
  const normalized = normalizeAssistantText(text);
  const pattern = kind === "in"
    ? /som hon[^\d]{0,12}(\d{1,2})(?:\s*(?:h|:)\s*(\d{2})?)?/i
    : /muon hon[^\d]{0,12}(\d{1,2})(?:\s*(?:h|:)\s*(\d{2})?)?/i;
  const match = normalized.match(pattern);
  if (!match) return undefined;
  const referenceHour = Number(match[1]);
  const referenceMinute = Number(match[2] ?? 0);
  const hour = kind === "in" ? referenceHour - 1 : referenceHour + 1;
  if (hour < 0 || hour > 23 || referenceMinute > 59) return undefined;
  return `${hour.toString().padStart(2, "0")}:${referenceMinute.toString().padStart(2, "0")}`;
}

function userMessagesFromHistory(history: string) {
  const messages = [...history.matchAll(/(?:^|\n)USER:\s*([\s\S]*?)(?=\n(?:USER|ASSISTANT|SYSTEM|TOOL):|$)/g)].map((match) => match[1].trim()).filter(Boolean);
  return messages.length > 0 ? messages : history.trim() ? [history.trim()] : [];
}

function latestTextWith(texts: string[], predicate: (text: string) => boolean) {
  return [...texts].reverse().find(predicate) ?? "";
}

function latestStaff(staff: AttendanceStaffCandidate[], texts: string[]) {
  for (const text of texts) {
    const normalized = normalizeAssistantText(text);
    const matches = staff.filter((candidate) => normalized.includes(normalizeAssistantText(candidate.fullName)));
    if (matches.length > 0) return matches.sort((a, b) => b.fullName.length - a.fullName.length)[0];
  }
  return undefined;
}

export function inferAttendanceIntent(question: string, history: string, staff: AttendanceStaffCandidate[], currentYear = new Date().getFullYear()): AttendanceIntent | null {
  const normalizedQuestion = normalizeAssistantText(question);
  const historyUsers = userMessagesFromHistory(history);
  const userTexts = [...historyUsers, question];
  const normalizedAllUserText = normalizeAssistantText(userTexts.join("\n"));
  if (!(normalizedAllUserText.includes("cham cong") || normalizedAllUserText.includes("ngay cong") || normalizedAllUserText.includes("bo sung cong") || normalizedAllUserText.includes("di lam"))) return null;

  const target = latestStaff(staff, [question, ...historyUsers]);
  const dateSource = extractAttendanceDateRange(question, currentYear).length > 0
    ? question
    : latestTextWith(historyUsers, (text) => extractAttendanceDateRange(text, currentYear).length > 0);
  const timeInSource = extractAttendanceTime(question, "in") || extractFlexibleBoundaryTime(question, "in")
    ? question
    : latestTextWith(historyUsers, (text) => Boolean(extractAttendanceTime(text, "in") || extractFlexibleBoundaryTime(text, "in")));
  const timeOutSource = extractAttendanceTime(question, "out") || extractFlexibleBoundaryTime(question, "out")
    ? question
    : latestTextWith(historyUsers, (text) => Boolean(extractAttendanceTime(text, "out") || extractFlexibleBoundaryTime(text, "out")));
  const dates = extractAttendanceDateRange(dateSource, currentYear);
  const checkIn = extractFlexibleBoundaryTime(timeInSource, "in") ?? extractAttendanceTime(timeInSource, "in");
  const checkOut = extractFlexibleBoundaryTime(timeOutSource, "out") ?? extractAttendanceTime(timeOutSource, "out");
  const confirmedFullAttendance = normalizedQuestion.includes("chua nghi") || normalizedQuestion.includes("khong nghi") || normalizedQuestion.includes("di lam du") || normalizedQuestion.includes("tat ca cac ngay")
    || historyUsers.some((text) => {
      const normalized = normalizeAssistantText(text);
      return normalized.includes("chua nghi") || normalized.includes("khong nghi") || normalized.includes("di lam du") || normalized.includes("tat ca cac ngay");
    });
  if (!target || dates.length === 0 || !checkIn || !checkOut || !confirmedFullAttendance) return null;

  const flexibleTime = Boolean(extractFlexibleBoundaryTime(timeInSource, "in") || extractFlexibleBoundaryTime(timeOutSource, "out"));
  return {
    staffName: target.fullName,
    dates,
    checkIn,
    checkOut,
    note: `AI chấm công theo lệnh ADMIN; đủ ngày trong khoảng ${dates[0]} đến ${dates[dates.length - 1]}${flexibleTime ? "; đã chọn giờ biên an toàn sớm hơn giờ bắt đầu và muộn hơn giờ kết thúc theo yêu cầu." : "."}`,
  };
}
