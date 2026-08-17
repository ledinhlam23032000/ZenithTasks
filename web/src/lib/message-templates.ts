// ============================================================================
// MẪU TIN NHẮN (B2 bậc 1) — toán THUẦN, không phụ thuộc DB (có test ở __tests__).
//
// Sinh sẵn nội dung tin nhắn cho các nút liên hệ (gọi/SMS/Zalo) theo từng ngữ
// cảnh: nhắc công nợ, nhắc tái khám, xác nhận lịch hẹn, sinh nhật, khách nguội.
// Chỉ tạo TEXT — việc gửi thật (SMS/Zalo OA) do nhân viên bấm gửi qua app điện
// thoại của họ (deep-link `sms:`/`zalo.me`), KHÔNG tự động gửi từ hệ thống.
// ============================================================================

const vnd = new Intl.NumberFormat("vi-VN");
const fmt = (n: number) => `${vnd.format(Math.round(n))}đ`;

export function tplDebtReminder(opts: { fullName: string; debtAmount: number; caseCode: string }): string {
  return `Chào ${opts.fullName}, phòng khám xin nhắc hồ sơ ${opts.caseCode} của bạn còn công nợ ${fmt(opts.debtAmount)}. Vui lòng sắp xếp thanh toán giúp ạ. Cảm ơn bạn!`;
}

export function tplFollowUpReminder(opts: { fullName: string; whenLabel: string }): string {
  return `Chào ${opts.fullName}, phòng khám nhắc bạn có lịch tái khám vào ${opts.whenLabel}. Bạn vui lòng xác nhận giúp ạ. Cảm ơn bạn!`;
}

export function tplApptConfirm(opts: { fullName: string; whenLabel: string }): string {
  return `Chào ${opts.fullName}, phòng khám xin xác nhận lịch hẹn của bạn vào ${opts.whenLabel}. Bạn vui lòng phản hồi giúp ạ. Cảm ơn bạn!`;
}

export function tplBirthday(opts: { fullName: string }): string {
  return `Chào ${opts.fullName}, phòng khám chúc bạn sinh nhật vui vẻ! Mời bạn ghé phòng khám trong tháng để nhận ưu đãi sinh nhật nhé.`;
}

export function tplWinback(opts: { fullName: string }): string {
  return `Chào ${opts.fullName}, lâu rồi phòng khám chưa được gặp lại bạn. Mời bạn ghé tái khám/chăm sóc lại nhé, hiện đang có ưu đãi cho khách quay lại.`;
}
