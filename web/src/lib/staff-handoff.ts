export type StaffHandoffCounts = {
  customers: number;
  appointments: number;
  clinicalCases: number;
  careMessages: number;
  followUps: number;
  plans: number;
};

export type StaffHandoffItem = {
  key: keyof StaffHandoffCounts;
  label: string;
  count: number;
  blocking: boolean;
};

export function buildStaffHandoffChecklist(counts: StaffHandoffCounts): StaffHandoffItem[] {
  return [
    { key: "customers", label: "Khách đã tạo / phụ trách", count: counts.customers, blocking: counts.customers > 0 },
    { key: "appointments", label: "Lịch hẹn đang gán", count: counts.appointments, blocking: counts.appointments > 0 },
    { key: "clinicalCases", label: "Hồ sơ lâm sàng đang phụ trách", count: counts.clinicalCases, blocking: counts.clinicalCases > 0 },
    { key: "careMessages", label: "Tin chăm sóc đã tạo", count: counts.careMessages, blocking: counts.careMessages > 0 },
    { key: "followUps", label: "Lịch tái khám đã tạo", count: counts.followUps, blocking: counts.followUps > 0 },
    { key: "plans", label: "Kế hoạch đang sở hữu", count: counts.plans, blocking: counts.plans > 0 },
  ];
}

export function handoffHasBlockers(items: readonly StaffHandoffItem[]): boolean {
  return items.some((item) => item.blocking);
}
