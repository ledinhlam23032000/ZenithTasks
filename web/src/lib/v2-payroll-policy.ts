export function hasTwoDistinctPayrollApprovals(approvedById: string | null | undefined, secondApprovedById: string | null | undefined) {
  return Boolean(approvedById && secondApprovedById && approvedById !== secondApprovedById);
}

export function canVoidPayrollStatus(status: string) {
  return status === "APPROVED" || status === "FINALIZED";
}
