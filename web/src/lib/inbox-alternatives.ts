export type InboxAlternative = { key: "callback" | "customer" | "assign"; label: string; description: string };

export function inboxAlternatives(input: { withinWindow: boolean; hasCustomer: boolean; channelActive: boolean }): InboxAlternative[] {
  if (input.withinWindow && input.channelActive) return [];
  const alternatives: InboxAlternative[] = [
    { key: "callback", label: "Đặt lịch gọi lại", description: "Ghi nhận lịch hẹn thay vì cố gửi tin ngoài cửa sổ." },
    { key: "assign", label: "Chuyển người phụ trách", description: "Đưa hội thoại vào đúng hàng đợi để người có thể xử lý tiếp." },
  ];
  if (input.hasCustomer) alternatives.splice(1, 0, { key: "customer", label: "Mở Customer 360", description: "Xem lịch sử, trạng thái và next action của khách." });
  return alternatives;
}
