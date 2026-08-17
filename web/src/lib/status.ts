import type { Tone } from "@/components/ui/badge";
import type {
  AppointmentStatus,
  AppointmentType,
  CaseStatus,
  ConsultResult,
  CustomerSource,
  PaymentMethod,
  CareChannel,
  Gender,
} from "@/generated/prisma/client";

export const APPT_STATUS: Record<AppointmentStatus, { label: string; tone: Tone }> = {
  BOOKED: { label: "Đã đặt lịch", tone: "blue" },
  CONFIRMED: { label: "Đã xác nhận", tone: "brand" },
  ARRIVED: { label: "Đã đến", tone: "purple" },
  IN_CONSULT: { label: "Đang tư vấn", tone: "amber" },
  IN_SERVICE: { label: "Đang làm dịch vụ", tone: "amber" },
  DONE: { label: "Hoàn thành", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
  NO_SHOW: { label: "Không đến", tone: "slate" },
};

export const APPT_TYPE: Record<AppointmentType, { label: string; tone: Tone }> = {
  NEW: { label: "Khách mới", tone: "brand" },
  FOLLOW_UP: { label: "Tái khám", tone: "purple" },
  RE_SERVICE: { label: "Làm tiếp", tone: "blue" },
};

export const CASE_STATUS: Record<CaseStatus, { label: string; tone: Tone }> = {
  OPEN: { label: "Mới mở", tone: "slate" },
  CONSULTED: { label: "Đã tư vấn", tone: "blue" },
  SERVICED: { label: "Đang làm DV", tone: "amber" },
  COMPLETED: { label: "Hoàn tất", tone: "green" },
  CANCELLED: { label: "Đã hủy", tone: "red" },
};

// Khách "đã làm dịch vụ" = có ít nhất 1 hồ sơ ở 1 trong 2 trạng thái này. Dùng để phân loại
// khách hàng "Chưa làm dịch vụ" ở `/khach-hang` VÀ gộp hiển thị cùng nhóm ở `/khach-tham-khao`
// — 2 nơi PHẢI cùng định nghĩa "chưa làm" giống hệt nhau nên đặt chung 1 chỗ.
export const DONE_CASE_STATUSES: CaseStatus[] = ["SERVICED", "COMPLETED"];

// Nhãn trạng thái ca DÀNH RIÊNG cho cổng khách (`khach/[token]`) — vài viết tắt nội bộ
// như "Đang làm DV" không phù hợp hiện cho khách xem, giữ tone màu như CASE_STATUS.
export const CASE_STATUS_PORTAL: Record<CaseStatus, string> = {
  OPEN: CASE_STATUS.OPEN.label,
  CONSULTED: CASE_STATUS.CONSULTED.label,
  SERVICED: "Đang thực hiện",
  COMPLETED: CASE_STATUS.COMPLETED.label,
  CANCELLED: CASE_STATUS.CANCELLED.label,
};

export const CONSULT_RESULT: Record<ConsultResult, { label: string; tone: Tone }> = {
  PENDING: { label: "Chưa chốt", tone: "slate" },
  AGREED: { label: "Chốt dịch vụ", tone: "green" },
  CONSIDERING: { label: "Đang cân nhắc", tone: "amber" },
  DECLINED: { label: "Từ chối", tone: "red" },
};

export const SOURCE_LABEL: Record<CustomerSource, string> = {
  MARKETING: "Marketing",
  COLLABORATOR: "Cộng tác viên",
  WALK_IN: "Khách vãng lai",
  REFERRAL: "Được giới thiệu",
  HOTLINE: "Hotline",
  FACEBOOK: "Facebook",
  ZALO: "Zalo",
  TIKTOK: "TikTok",
  OTHER: "Khác",
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  CARD: "Quẹt thẻ",
  TRANSFER: "Chuyển khoản",
  EWALLET: "Ví điện tử",
};

export const CARE_CHANNEL: Record<CareChannel, { label: string; tone: Tone }> = {
  NOTE: { label: "Ghi chú", tone: "slate" },
  ZALO: { label: "Zalo", tone: "blue" },
  SMS: { label: "SMS", tone: "green" },
  CALL: { label: "Gọi điện", tone: "purple" },
  EMAIL: { label: "Email", tone: "amber" },
  OTHER: { label: "Khác", tone: "slate" },
};

export const GENDER_LABEL: Record<Gender, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
};

// ============================================================================
// NHẬT KÝ HỆ THỐNG (AuditLog.action) — NGUỒN DUY NHẤT nhãn + tone cho mọi loại hành
// động được ghi qua audit()/auditRequired() (lib/audit.ts). Trước đây `/nhat-ky` (trang)
// và `/nhat-ky/export` (route) mỗi nơi tự định nghĩa 1 bản riêng, chỉ có 15/90+ loại thật
// sự dùng trong code — thiếu cả những hành động quan trọng nhất (EDIT_CASE_DATE,
// EDIT_ATTENDANCE, CLOSE_PERIOD, PAY_SALARY…) nên không lọc/tìm riêng được dù vẫn hiện
// trong danh sách chung (tên tiếng Anh thô). Thêm hành động mới ở bất kỳ actions.ts nào
// → thêm nhãn tương ứng Ở ĐÂY (không phải ở page.tsx/export/route.ts).
export const AUDIT_ACTION_LABEL: Record<string, { label: string; tone: Tone }> = {
  LOGIN: { label: "Đăng nhập", tone: "slate" },
  LOGOUT: { label: "Đăng xuất", tone: "slate" },
  CHANGE_PASSWORD: { label: "Đổi mật khẩu", tone: "amber" },
  RESET_PASSWORD: { label: "Đặt lại mật khẩu", tone: "amber" },
  ENABLE_2FA: { label: "Bật xác thực 2 lớp", tone: "green" },
  DISABLE_2FA: { label: "Tắt xác thực 2 lớp", tone: "amber" },
  REVEAL_PHONE: { label: "Xem SĐT đầy đủ", tone: "amber" },
  // Khách hàng / khách tham khảo
  CREATE_CUSTOMER: { label: "Tạo khách", tone: "green" },
  UPDATE_CUSTOMER: { label: "Sửa khách", tone: "blue" },
  DELETE_CUSTOMER: { label: "Xóa khách", tone: "red" },
  GENERATE_PORTAL_LINK: { label: "Tạo link cổng khách", tone: "blue" },
  REVOKE_PORTAL_LINK: { label: "Thu hồi link cổng khách", tone: "amber" },
  CREATE_LEAD: { label: "Tạo khách tham khảo", tone: "green" },
  UPDATE_LEAD: { label: "Sửa khách tham khảo", tone: "blue" },
  SET_LEAD_STATUS: { label: "Đổi trạng thái khách tham khảo", tone: "blue" },
  DELETE_LEAD: { label: "Xóa khách tham khảo", tone: "red" },
  CONVERT_LEAD: { label: "Chuyển khách tham khảo thành khách hàng", tone: "green" },
  // Hồ sơ điều trị
  CREATE_CASE: { label: "Tạo hồ sơ điều trị", tone: "green" },
  UPDATE_CASE_INFO: { label: "Sửa thông tin hồ sơ", tone: "blue" },
  UPDATE_REVENUE_ALLOCATION: { label: "Sửa phân chia doanh thu", tone: "amber" },
  EDIT_CASE_DATE: { label: "Sửa ngày hồ sơ", tone: "amber" },
  LOCK_CASE: { label: "Khóa hồ sơ", tone: "purple" },
  UNLOCK_CASE: { label: "Mở khóa hồ sơ", tone: "purple" },
  DELETE_CASE: { label: "Xóa hồ sơ", tone: "red" },
  CREATE_CASE_SERVICE: { label: "Thêm dịch vụ vào hồ sơ", tone: "green" },
  UPDATE_CASE_SERVICE: { label: "Sửa dịch vụ trong hồ sơ", tone: "amber" },
  DELETE_CASE_SERVICE: { label: "Xóa dịch vụ khỏi hồ sơ", tone: "red" },
  APPLY_VOUCHER: { label: "Áp voucher", tone: "purple" },
  CREATE_PAYMENT: { label: "Ghi nhận thanh toán", tone: "green" },
  UPDATE_PAYMENT: { label: "Sửa khoản thu", tone: "amber" },
  DELETE_PAYMENT: { label: "Xóa khoản thu", tone: "red" },
  USE_MATERIAL: { label: "Dùng vật tư trong hồ sơ", tone: "slate" },
  UPDATE_MATERIAL: { label: "Sửa vật tư trong hồ sơ", tone: "blue" },
  REMOVE_MATERIAL: { label: "Xóa vật tư khỏi hồ sơ", tone: "red" },
  APPLY_SERVICE_BOM: { label: "Trừ vật tư theo định mức", tone: "slate" },
  UPLOAD_PHOTO: { label: "Tải ảnh", tone: "slate" },
  DELETE_PHOTO: { label: "Xóa ảnh", tone: "red" },
  UPLOAD_DOCUMENT: { label: "Tải giấy tờ", tone: "slate" },
  DELETE_DOCUMENT: { label: "Xóa giấy tờ", tone: "red" },
  CREATE_CONSENT: { label: "Tạo phiếu đồng ý", tone: "green" },
  DELETE_CONSENT: { label: "Xóa phiếu đồng ý", tone: "red" },
  CREATE_FOLLOW_UP: { label: "Hẹn tái khám", tone: "green" },
  MARK_FOLLOW_UP_ARRIVED: { label: "Đánh dấu tái khám đã đến", tone: "blue" },
  DELETE_FOLLOW_UP: { label: "Xóa hẹn tái khám", tone: "red" },
  // Lịch hẹn
  CREATE_APPOINTMENT: { label: "Tạo lịch hẹn", tone: "green" },
  UPDATE_APPOINTMENT: { label: "Sửa lịch hẹn", tone: "blue" },
  UPDATE_APPOINTMENT_STATUS: { label: "Đổi trạng thái lịch hẹn", tone: "slate" },
  DELETE_APPOINTMENT: { label: "Xóa lịch hẹn", tone: "red" },
  PUBLIC_BOOKING: { label: "Đặt lịch công khai (khách tự đặt)", tone: "slate" },
  PORTAL_CONFIRM_APPOINTMENT: { label: "Khách xác nhận lịch hẹn (cổng khách)", tone: "slate" },
  PORTAL_REQUEST_RESCHEDULE: { label: "Khách yêu cầu đổi lịch (cổng khách)", tone: "slate" },
  PORTAL_SUBMIT_NPS: { label: "Khách gửi đánh giá NPS (cổng khách)", tone: "slate" },
  // Công nợ
  SET_DEBT_THRESHOLD: { label: "Đặt ngưỡng cảnh báo công nợ", tone: "amber" },
  SAVE_DEBT_PLAN: { label: "Lưu hẹn nợ", tone: "blue" },
  DELETE_DEBT_PLAN: { label: "Xóa hẹn nợ", tone: "red" },
  // Chấm công
  CHECK_IN: { label: "Chấm công vào", tone: "slate" },
  CHECK_OUT: { label: "Chấm công ra", tone: "slate" },
  EDIT_ATTENDANCE: { label: "Sửa chấm công", tone: "amber" },
  DELETE_ATTENDANCE: { label: "Xóa chấm công", tone: "red" },
  // Lương & hoa hồng / Kế toán
  SAVE_PAYROLL: { label: "Lưu lương nhân sự", tone: "amber" },
  BULK_SAVE_PAYROLL: { label: "Lưu lương hàng loạt", tone: "amber" },
  PAY_SALARY: { label: "Chi lương", tone: "amber" },
  PAY_SALARY_ALL: { label: "Chi lương toàn bộ", tone: "amber" },
  UNDO_PAY_SALARY: { label: "Hoàn tác chi lương", tone: "amber" },
  PAY_COMMISSION: { label: "Chi hoa hồng cộng tác viên", tone: "amber" },
  UNDO_PAY_COMMISSION: { label: "Hoàn tác chi hoa hồng CTV", tone: "amber" },
  CLOSE_PERIOD: { label: "Chốt sổ tháng", tone: "purple" },
  REOPEN_PERIOD: { label: "Mở lại sổ tháng", tone: "purple" },
  // Sổ thu chi
  CREATE_CASH_TRANSACTION: { label: "Tạo phiếu thu/chi", tone: "green" },
  UPDATE_CASH_TRANSACTION: { label: "Sửa phiếu thu/chi", tone: "amber" },
  DELETE_CASH_TRANSACTION: { label: "Xóa phiếu thu/chi", tone: "red" },
  STOCK_IN: { label: "Nhập kho", tone: "green" },
  STOCK_IN_BATCH: { label: "Nhập kho (nhiều dòng)", tone: "green" },
  // Chăm sóc khách hàng / Kênh giao tiếp
  CREATE_CARE: { label: "Tạo tin chăm sóc", tone: "green" },
  UPDATE_CARE: { label: "Sửa tin chăm sóc", tone: "blue" },
  DELETE_CARE: { label: "Xóa tin chăm sóc", tone: "red" },
  LINK_CONVERSATION: { label: "Gắn hội thoại với khách", tone: "blue" },
  UNLINK_CONVERSATION: { label: "Bỏ gắn hội thoại", tone: "blue" },
  UPDATE_CONVERSATION_WORKFLOW: { label: "Đổi trạng thái/phân công hội thoại", tone: "blue" },
  CONNECT_CHANNEL: { label: "Kết nối kênh giao tiếp", tone: "green" },
  RECONNECT_CHANNEL: { label: "Kết nối lại kênh", tone: "green" },
  EXTEND_CHANNEL_TOKEN: { label: "Gia hạn token kênh", tone: "amber" },
  DISCONNECT_CHANNEL: { label: "Ngắt kết nối kênh", tone: "amber" },
  // Trợ lý AI / Kế hoạch
  LOG_ASSISTANT_REQUEST: { label: "Ghi yêu cầu từ Trợ lý AI", tone: "slate" },
  ASSISTANT_CHANGE_PROPOSAL: { label: "Trợ lý AI đề xuất thay đổi", tone: "purple" },
  CREATE_PLAN: { label: "Tạo kế hoạch", tone: "green" },
  UPDATE_PLAN: { label: "Sửa kế hoạch", tone: "blue" },
  DELETE_PLAN: { label: "Xóa kế hoạch", tone: "red" },
  CREATE_PLAN_FROM_AI: { label: "Tạo kế hoạch bằng AI", tone: "purple" },
  CREATE_PLAN_TASK: { label: "Tạo nhiệm vụ kế hoạch", tone: "green" },
  UPDATE_PLAN_TASK: { label: "Sửa nhiệm vụ kế hoạch", tone: "blue" },
  DELETE_PLAN_TASK: { label: "Xóa nhiệm vụ kế hoạch", tone: "red" },
  SET_PLAN_TASK_STATUS: { label: "Đổi trạng thái nhiệm vụ", tone: "blue" },
  REORDER_PLAN_TASK: { label: "Sắp xếp lại nhiệm vụ", tone: "slate" },
  // Nhân sự
  DELETE_STAFF: { label: "Xóa nhân sự", tone: "red" },
};

// Nhạy cảm = xóa dữ liệu, xem thông tin riêng tư, hoặc động tới tiền lương/sổ sách/bảo
// mật tài khoản — dùng để lọc "Hoạt động nhạy cảm gần đây" ở `/he-thong` (không lẫn với
// việc chấm công/đăng nhập/tạo mới thường nhật). Tự nhận mọi DELETE_*/REVEAL_* (khỏi phải
// liệt kê tay từng cái mới thêm sau này trong AUDIT_ACTION_LABEL) + danh sách bổ sung cho
// các hành động nhạy cảm không thuộc 2 nhóm đó.
const AUDIT_SENSITIVE_EXTRA = new Set([
  "RESET_PASSWORD",
  "DISABLE_2FA",
  "EDIT_CASE_DATE",
  "EDIT_ATTENDANCE",
  "UPDATE_PAYMENT",
  "UPDATE_CASE_SERVICE",
  "UPDATE_CASH_TRANSACTION",
  "UPDATE_REVENUE_ALLOCATION",
  "APPLY_VOUCHER",
  "SET_DEBT_THRESHOLD",
  "LOCK_CASE",
  "UNLOCK_CASE",
  "CLOSE_PERIOD",
  "REOPEN_PERIOD",
  "PAY_SALARY",
  "PAY_SALARY_ALL",
  "UNDO_PAY_SALARY",
  "PAY_COMMISSION",
  "UNDO_PAY_COMMISSION",
  "SAVE_PAYROLL",
  "BULK_SAVE_PAYROLL",
  "REVOKE_PORTAL_LINK",
  "DISCONNECT_CHANNEL",
  "EXTEND_CHANNEL_TOKEN",
]);

export function isSensitiveAuditAction(action: string): boolean {
  return action.startsWith("DELETE_") || action.startsWith("REVEAL_") || AUDIT_SENSITIVE_EXTRA.has(action);
}
