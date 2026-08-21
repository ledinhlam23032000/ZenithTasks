export type CaseLockChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  blocking: boolean;
  hint: string;
};

export type CaseLockChecklistInput = {
  customerName: string | null;
  phoneLast5: string | null;
  consultationExists: boolean;
  patientConfirmed: boolean;
  serviceCount: number;
  materialUsageCount: number;
  consentCount: number;
  documentCount: number;
  financialAnomalyCount: number;
};

/**
 * Checklist trước khóa hồ sơ. Vật tư không được tự động áp BOM; mục vật tư chỉ
 * nhắc nhân sự tự rà và tự trừ theo thủ thuật thực tế, không biến thành blocker.
 */
export function buildCaseLockChecklist(input: CaseLockChecklistInput): CaseLockChecklistItem[] {
  return [
    {
      key: "customer",
      label: "Thông tin khách đã đủ",
      done: Boolean(input.customerName?.trim()) && Boolean(input.phoneLast5?.trim()),
      blocking: true,
      hint: "Tên khách và 5 số cuối điện thoại đã có.",
    },
    {
      key: "consultation",
      label: "Phiếu tư vấn đã xác nhận",
      done: input.consultationExists && input.patientConfirmed,
      blocking: true,
      hint: "Cần lưu phiếu tư vấn và xác nhận thông tin với khách.",
    },
    {
      key: "service",
      label: "Đã ghi dịch vụ/thủ thuật thực tế",
      done: input.serviceCount > 0,
      blocking: true,
      hint: "Không khóa hồ sơ rỗng dịch vụ.",
    },
    {
      key: "financial",
      label: "Không có bất thường tài chính",
      done: input.financialAnomalyCount === 0,
      blocking: true,
      hint: "Kiểm tra khoản thu, tổng tiền và công nợ trước khi khóa.",
    },
    {
      key: "materials",
      label: "Đã tự rà và tự trừ vật tư theo ca",
      done: input.materialUsageCount > 0,
      blocking: false,
      hint: "Không tự động áp BOM; nhân sự phải tự chọn vật tư đúng thủ thuật.",
    },
    {
      key: "consents",
      label: "Đã kiểm tra phiếu đồng ý",
      done: input.consentCount > 0,
      blocking: false,
      hint: "Một số thủ thuật có thể cần phiếu đồng ý riêng.",
    },
    {
      key: "documents",
      label: "Đã kiểm tra tài liệu/ảnh hồ sơ",
      done: input.documentCount > 0,
      blocking: false,
      hint: "Cảnh báo tham khảo, không ép mọi ca phải có file.",
    },
  ];
}

export function canLockCase(checklist: CaseLockChecklistItem[]): boolean {
  return checklist.every((item) => !item.blocking || item.done);
}
