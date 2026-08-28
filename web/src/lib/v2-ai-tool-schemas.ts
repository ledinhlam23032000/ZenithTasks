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
