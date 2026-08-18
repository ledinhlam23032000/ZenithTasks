import { describe, expect, it } from "vitest";
import { extractAttendanceDateRange, inferAttendanceIntent } from "./attendance-intent";

describe("attendance intent", () => {
  it("tách đủ 17 ngày từ 2/8 đến 18/8 và giữ cả cuối tuần", () => {
    const dates = extractAttendanceDateRange("từ 2/8 đến 18/8/2026", 2026);
    expect(dates).toHaveLength(17);
    expect(dates[0]).toBe("2026-08-02");
    expect(dates.at(-1)).toBe("2026-08-18");
  });

  it("ghép câu lệnh ban đầu với xác nhận không nghỉ để tạo intent", () => {
    const intent = inferAttendanceIntent(
      "chưa nghỉ ngày nào nhé, anh là admin, anh ra lệnh em đi chấm công hộ",
      "Đào Ngọc Trang từ 2/8 đến 18/8/2026 chấm công hộ, sáng làm lúc 8h và chiều về lúc 17h",
      [{ id: "u1", fullName: "Đào Ngọc Trang" }],
      2026,
    );
    expect(intent).toMatchObject({ staffName: "Đào Ngọc Trang", checkIn: "08:00", checkOut: "17:00" });
    expect(intent?.dates).toHaveLength(17);
  });

  it("không lấy tên và giờ cũ khi câu mới đã nêu nhân sự khác", () => {
    const intent = inferAttendanceIntent(
      "tương tự, lần này chấm công cho bác sĩ Lê Đình Lam nhé, thời gian y hệt",
      "USER: Đào Ngọc Trang từ 2/8 đến 18/8/2026 chấm công hộ, sáng 8h và chiều 17h\nASSISTANT: Xem trước thao tác cho Đào Ngọc Trang\nUSER: chưa nghỉ ngày nào",
      [{ id: "u1", fullName: "Đào Ngọc Trang" }, { id: "u2", fullName: "Lê Đình Lam" }],
      2026,
    );
    expect(intent).toMatchObject({ staffName: "Lê Đình Lam", checkIn: "08:00", checkOut: "17:00" });
    expect(intent?.dates).toHaveLength(17);
  });

  it("chọn giờ biên khi người dùng yêu cầu sớm hơn 8h và muộn hơn 17h", () => {
    const intent = inferAttendanceIntent(
      "chấm công cho Đào Ngọc Trang từ 2/8/2026 đến 18/8/2026, sáng sớm hơn 8h, chiều muộn hơn 17h, chưa nghỉ ngày nào",
      "",
      [{ id: "u1", fullName: "Đào Ngọc Trang" }],
      2026,
    );
    expect(intent).toMatchObject({ staffName: "Đào Ngọc Trang", checkIn: "07:00", checkOut: "18:00" });
  });

  it("không tự tạo intent khi thiếu xác nhận đủ ngày hoặc thiếu giờ", () => {
    expect(inferAttendanceIntent("chấm công cho Đào Ngọc Trang từ 2/8 đến 18/8/2026", "", [{ id: "u1", fullName: "Đào Ngọc Trang" }], 2026)).toBeNull();
  });
});
