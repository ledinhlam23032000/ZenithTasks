// ============================================================================
// TÌNH TRẠNG BẢO MẬT — cảnh báo các cấu hình kém an toàn cho ADMIN nhìn thấy.
//
// KHÔNG hard-fail khi khởi động: nếu phòng khám ĐANG chạy bằng khoá mặc định và
// đã có dữ liệu mã hoá bằng khoá đó, việc chặn khởi động sẽ làm sập app + không
// giải mã được. Thay vào đó: hiện banner đỏ cho ADMIN để chủ động xử lý
// (đổi khoá thật + mã hoá lại bằng `npm run rotate:phone`).
// ============================================================================

export type SecurityWarning = { key: string; title: string; detail: string };

/** Danh sách cảnh báo bảo mật hiện tại (rỗng = ổn). */
export function securityWarnings(): SecurityWarning[] {
  const w: SecurityWarning[] = [];

  if (!process.env.PHONE_ENC_KEY) {
    w.push({
      key: "missing-phone-key",
      title: "Thiếu khoá mã hoá số điện thoại",
      detail: "Hãy cấu hình PHONE_ENC_KEY ổn định trong secret manager trước khi đọc hoặc ghi dữ liệu khách hàng.",
    });
  }

  return w;
}
