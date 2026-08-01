import { describe, expect, it } from "vitest";
import { buildInboxViewModel } from "./inbox-view-model";

const careUser = { id: "care-1", role: "CARE" as const, permissions: null };
const base = {
  enabled: true,
  now: new Date("2026-08-01T03:00:00.000Z"),
  user: careUser,
  conversations: [{
    id: "conv-1", status: "OPEN" as const, assigneeId: null, assigneeName: null,
    contactName: "Nguyễn An", customerId: null, provider: "ZALO_OA" as const,
    preview: "Xin chào", lastMessageAt: new Date("2026-08-01T02:30:00.000Z"),
    unreadCount: 2, responseTargetMinutes: 15, openedAt: new Date("2026-08-01T02:00:00.000Z"), firstResponseAt: null,
  }],
  selected: {
    id: "conv-1", customerId: null, provider: "ZALO_OA" as const,
    messages: [{ id: "msg-1", direction: "OUT" as const, type: "TEXT" as const, content: "Thử gửi", status: "FAILED" as const, providerErrorMessage: "OAuthException access-token=secret", createdAt: new Date("2026-08-01T02:10:00.000Z"), attachmentIds: [] }],
    presence: [{ userId: "manager-1", fullName: "Quản lý", isTyping: true }],
  },
};

describe("buildInboxViewModel", () => {
  it("hiển thị lỗi gửi sạch, không lộ lỗi nội bộ nhà cung cấp", () => {
    const vm = buildInboxViewModel(base);
    expect(vm.selected?.messages[0].statusLabel).toBe("Gửi thất bại");
    expect(JSON.stringify(vm)).not.toContain("OAuthException");
    expect(JSON.stringify(vm)).not.toContain("access-token");
  });

  it("chuẩn hóa nhãn kênh, khách chưa liên kết, số chưa đọc và quá hạn", () => {
    const vm = buildInboxViewModel(base);
    expect(vm.conversations[0]).toMatchObject({ providerLabel: "Zalo OA", customerLabel: "Chưa liên kết hồ sơ", unreadCount: 2, overdue: true });
  });

  it("chỉ báo quá hạn khi tài khoản kênh có cấu hình mục tiêu", () => {
    const vm = buildInboxViewModel({ ...base, conversations: [{ ...base.conversations[0], responseTargetMinutes: null }] });
    expect(vm.conversations[0].overdue).toBe(false);
  });

  it("hiển thị người đang xem và đang gõ", () => {
    const vm = buildInboxViewModel(base);
    expect(vm.selected?.presenceLabel).toBe("Quản lý đang soạn tin");
  });

  it("ẩn hộp thư với cổ đông nhưng vẫn giữ tab nhật ký thủ công", () => {
    const vm = buildInboxViewModel({ ...base, user: { id: "share-1", role: "SHAREHOLDER" as const, permissions: { grant: ["inbox.view"] } } });
    expect(vm.canUseInbox).toBe(false);
    expect(vm.showManualTab).toBe(true);
    expect(vm.conversations).toEqual([]);
  });
});
