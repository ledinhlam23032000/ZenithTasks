// ============================================================================
// NHẮC VIỆC KẾ TOÁN — tự suy ra "còn gì phải làm để chốt sổ tháng này".
//
// Cùng triết lý với `lib/workqueue.ts` (Việc cần làm hôm nay): tổng hợp TỪ DỮ
// LIỆU SẴN CÓ, KHÔNG đổi schema, KHÔNG cần cron. Khác ở chỗ đây là việc của kế
// toán (lương, chốt sổ) nên KHÔNG trộn vào workqueue chung — trang đó mở cho cả
// lễ tân/telesale/bác sĩ, không được lộ chuyện lương.
//
// Hàm THUẦN (không I/O): trang `/ke-toan` đã gọi `getMonthlyAccounting()` rồi,
// chỉ việc đưa số liệu vào đây — không phát sinh thêm truy vấn nào.
// ============================================================================

import type { Tone } from "@/components/ui/badge";

export type AccountingTask = {
  key: string;
  label: string; // việc cần làm
  detail: string; // giải thích ngắn cho người không rành kế toán
  tone: Tone;
  /** true = việc bắt buộc xử lý trước khi chốt sổ; false = chỉ nhắc cho biết. */
  blocking: boolean;
};

export type AccountingState = {
  monthKey: string; // "YYYY-MM"
  /** Tháng đã kết thúc (đang xem tháng quá khứ) — mới thúc chốt sổ, tháng đang chạy thì không. */
  isPastMonth: boolean;
  closed: boolean;
  hasData: boolean; // tháng có phát sinh gì không (tránh nhắc chốt sổ tháng trống)
  salaryPayable: number;
  salaryRemaining: number;
  unpaidStaffCount: number;
  ctvRemaining: number;
  unpaidCtvCount: number;
  /** Phiếu chi lương nhập tay trong sổ thu chi chưa gắn bảng lương (lệch sổ). */
  salaryGap: number;
  ctvGap: number;
  /** Nhân sự đang hoạt động nhưng 0 ngày công — lương cứng sẽ tính thiếu. */
  missingAttendanceCount: number;
};

const vnd = new Intl.NumberFormat("vi-VN");
const money = (n: number) => `${vnd.format(Math.round(n))} ₫`;

/** "2026-06" → "06/2026" (người dùng đọc quen kiểu này). */
function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-");
  return m && y ? `${m}/${y}` : monthKey;
}

/**
 * Danh sách việc kế toán còn tồn của tháng. Mảng rỗng = xong hết.
 * Xếp theo mức quan trọng: việc chặn chốt sổ lên trước.
 */
export function buildAccountingTasks(s: AccountingState): AccountingTask[] {
  const tasks: AccountingTask[] = [];

  // Sổ đã chốt thì mọi thứ đã khoá — không còn việc gì.
  if (s.closed) return tasks;

  if (s.missingAttendanceCount > 0) {
    tasks.push({
      key: "attendance",
      label: `${s.missingAttendanceCount} nhân sự chưa có ngày công`,
      detail: "Lương cứng tính theo ngày công — thiếu chấm công thì lương sẽ ra thiếu. Kiểm tra ở trang Chấm công trước khi chi lương.",
      tone: "amber",
      // CHỈ nhắc, không chặn chốt sổ: nhân sự nghỉ cả tháng / mới nghỉ việc mà chưa
      // tắt hoạt động vẫn hợp lệ là 0 ngày công — chặn ở đây sẽ không bao giờ chốt được sổ.
      blocking: false,
    });
  }

  if (s.unpaidStaffCount > 0) {
    tasks.push({
      key: "salary",
      label: `Còn ${s.unpaidStaffCount} người chưa chi lương · ${money(s.salaryRemaining)}`,
      detail: "Bấm “Chi lương cả tháng” để ghi phiếu chi vào Sổ thu chi và đánh dấu đã trả.",
      tone: "red",
      blocking: true,
    });
  }

  if (s.unpaidCtvCount > 0) {
    tasks.push({
      key: "commission",
      label: `Còn ${s.unpaidCtvCount} cộng tác viên chưa chi hoa hồng · ${money(s.ctvRemaining)}`,
      detail: "Chi ở bảng “Hoa hồng cộng tác viên” bên dưới.",
      tone: "amber",
      blocking: true,
    });
  }

  if (s.salaryGap !== 0 || s.ctvGap !== 0) {
    const parts: string[] = [];
    if (s.salaryGap !== 0) parts.push(`lương lệch ${money(Math.abs(s.salaryGap))}`);
    if (s.ctvGap !== 0) parts.push(`hoa hồng lệch ${money(Math.abs(s.ctvGap))}`);
    tasks.push({
      key: "gap",
      label: `Sổ thu chi lệch bảng lương (${parts.join(", ")})`,
      detail: "Có phiếu chi lương/hoa hồng nhập tay không gắn với bảng lương. Nên xóa phiếu nhập tay rồi bấm “Chi” tại đây cho khớp.",
      tone: "amber",
      blocking: false,
    });
  }

  // Chỉ thúc chốt sổ khi tháng đã kết thúc và có phát sinh.
  if (s.isPastMonth && s.hasData) {
    tasks.push({
      key: "close",
      label: `Tháng ${monthLabel(s.monthKey)} chưa chốt sổ`,
      detail:
        tasks.some((t) => t.blocking)
          ? "Xử lý xong các việc trên rồi bấm “Chốt sổ tháng” để khoá số liệu."
          : "Mọi việc đã xong — bấm “Chốt sổ tháng” để khoá số liệu, báo cáo về sau không đổi nữa.",
      tone: "brand",
      blocking: false,
    });
  }

  return tasks;
}

/** Tháng đã sẵn sàng chốt sổ (đã kết thúc, có phát sinh, không còn việc chặn). */
export function isReadyToClose(s: AccountingState): boolean {
  if (s.closed || !s.isPastMonth || !s.hasData) return false;
  return !buildAccountingTasks(s).some((t) => t.blocking);
}
