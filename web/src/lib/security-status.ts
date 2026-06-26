// ============================================================================
// TÌNH TRẠNG BẢO MẬT — cảnh báo các cấu hình kém an toàn cho ADMIN nhìn thấy.
//
// KHÔNG hard-fail khi khởi động: nếu phòng khám ĐANG chạy bằng khoá mặc định và
// đã có dữ liệu mã hoá bằng khoá đó, việc chặn khởi động sẽ làm sập app + không
// giải mã được. Thay vào đó: hiện banner đỏ cho ADMIN để chủ động xử lý
// (đổi khoá thật + mã hoá lại bằng `npm run rotate:phone`).
// ============================================================================

// Khoá DEMO ship trong docker-entrypoint.sh (fallback khi chưa đặt .env).
// Nếu khoá đang dùng trùng giá trị này → SĐT chưa thực sự được bảo vệ.
const DEMO_PHONE_KEY = "QKuRqi5MjrXaJ6Dv5XwMQCD/0Dmyvc2TuTUEBf8nGM8=";

export type SecurityWarning = { key: string; title: string; detail: string };

/** Danh sách cảnh báo bảo mật hiện tại (rỗng = ổn). */
export function securityWarnings(): SecurityWarning[] {
  const w: SecurityWarning[] = [];

  if (process.env.PHONE_ENC_KEY === DEMO_PHONE_KEY) {
    w.push({
      key: "demo-phone-key",
      title: "Đang dùng khoá mã hoá số điện thoại MẶC ĐỊNH",
      detail:
        "Số điện thoại khách chưa thực sự được bảo vệ vì đang dùng khoá demo công khai. " +
        "Hãy đặt PHONE_ENC_KEY riêng trong .env rồi chạy mã hoá lại (npm run rotate:phone).",
    });
  }

  return w;
}
