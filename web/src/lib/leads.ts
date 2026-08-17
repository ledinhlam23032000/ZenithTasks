// ============================================================================
// KHÁCH THAM KHẢO (LEADS) — nhãn trạng thái + thống kê phễu. Toán THUẦN, có test.
// ============================================================================

export type LeadStatusKey = "NEW" | "CONTACTED" | "CONVERTED" | "LOST";

export const LEAD_STATUSES: LeadStatusKey[] = ["NEW", "CONTACTED", "CONVERTED", "LOST"];

export const LEAD_STATUS_LABEL: Record<LeadStatusKey, string> = {
  NEW: "Mới",
  CONTACTED: "Đã liên hệ",
  CONVERTED: "Đã chuyển khách",
  LOST: "Không quan tâm",
};

export const LEAD_STATUS_TONE: Record<LeadStatusKey, "slate" | "amber" | "green" | "red"> = {
  NEW: "amber",
  CONTACTED: "slate",
  CONVERTED: "green",
  LOST: "red",
};

export type LeadSummary = {
  total: number;
  byStatus: Record<LeadStatusKey, number>;
  open: number; // còn theo đuổi (NEW + CONTACTED)
  conversionRate: number; // % CONVERTED / total (0..100, làm tròn)
};

/** Thống kê phễu khách tham khảo từ danh sách trạng thái. */
export function summarizeLeads(leads: Array<{ status: LeadStatusKey }>): LeadSummary {
  const byStatus: Record<LeadStatusKey, number> = { NEW: 0, CONTACTED: 0, CONVERTED: 0, LOST: 0 };
  for (const l of leads) {
    if (l.status in byStatus) byStatus[l.status] += 1;
  }
  const total = leads.length;
  const conversionRate = total > 0 ? Math.round((byStatus.CONVERTED / total) * 100) : 0;
  return { total, byStatus, open: byStatus.NEW + byStatus.CONTACTED, conversionRate };
}
