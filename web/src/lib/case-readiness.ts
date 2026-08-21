export type CaseReadinessInput = {
  consultationExists: boolean;
  patientConfirmed: boolean;
  serviceCount: number;
  materialUsageCount: number;
  consentCount: number;
  documentCount: number;
  debt: number;
  followUpCount: number;
};

export type CaseReadinessBadge = {
  key: "tu-van" | "dich-vu" | "vat-tu" | "giay-to" | "tai-chinh" | "tai-kham";
  label: string;
  tone: "red" | "amber" | "green";
  blocking: boolean;
};

export function buildCaseReadinessBadges(input: CaseReadinessInput): CaseReadinessBadge[] {
  const badges: CaseReadinessBadge[] = [];
  if (!input.consultationExists || !input.patientConfirmed) badges.push({ key: "tu-van", label: "Tư vấn thiếu xác nhận", tone: "red", blocking: true });
  if (input.serviceCount === 0) badges.push({ key: "dich-vu", label: "Chưa có dịch vụ", tone: "amber", blocking: true });
  if (input.serviceCount > 0 && input.materialUsageCount === 0) badges.push({ key: "vat-tu", label: "Nhắc tự rà vật tư", tone: "amber", blocking: false });
  if (input.consentCount === 0) badges.push({ key: "giay-to", label: "Thiếu phiếu đồng ý", tone: "amber", blocking: true });
  if (input.documentCount === 0) badges.push({ key: "giay-to", label: "Thiếu giấy tờ", tone: "amber", blocking: false });
  if (input.debt > 0) badges.push({ key: "tai-chinh", label: "Còn công nợ", tone: "amber", blocking: false });
  if (input.followUpCount === 0) badges.push({ key: "tai-kham", label: "Chưa có lịch tái khám", tone: "amber", blocking: false });
  return badges;
}
