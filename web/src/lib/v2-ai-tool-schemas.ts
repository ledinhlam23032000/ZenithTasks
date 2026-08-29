import { z } from "zod";

export const CreateCustomerProfileSchema = z.object({
  fullName: z.string().min(2).describe("Họ và tên khách hàng"),
  phoneLast4: z.string().length(4).optional().describe("4 số cuối số điện thoại"),
  source: z.string().optional().describe("Nguồn khách hàng (VD: Facebook, Zalo, Trực tiếp)"),
});

export const GenerateCommissionDraftSchema = z.object({
  salesCode: z.string().describe("Mã hợp đồng / Giao dịch"),
  amount: z.number().min(0).describe("Số tiền giao dịch"),
  rate: z.number().min(0).max(100).describe("Tỷ lệ hoa hồng (%)"),
  note: z.string().optional().describe("Ghi chú thêm"),
});

export const SuspendChildAgentSchema = z.object({
  agentId: z.string().min(1).describe("ID của AI con (ZAiAgent) cần tạm dừng"),
  reason: z.string().min(5).max(500).describe("Lý do tạm dừng — bắt buộc để ghi audit rõ ràng"),
});

export const CreateWorkspaceTaskSchema = z.object({
  title: z.string().min(2).max(160).describe("Tiêu đề công việc"),
  description: z.string().max(5000).optional().describe("Mô tả chi tiết"),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).optional().describe("Mức ưu tiên"),
  assigneeId: z.string().optional().describe("ID thành viên phụ trách (phải là member active của project)"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe("Hạn chót, định dạng YYYY-MM-DD"),
});
