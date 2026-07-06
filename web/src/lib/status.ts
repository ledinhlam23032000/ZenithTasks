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
