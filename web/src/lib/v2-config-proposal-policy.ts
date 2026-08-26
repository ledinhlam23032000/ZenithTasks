const SAFE_RISKS = new Set(["L1", "L2", "L3", "L4"]);

export function isSafeWorkspaceProposalRisk(riskLevel: string) {
  return SAFE_RISKS.has(riskLevel.trim().toUpperCase());
}

export function canApplyWorkspaceProposal(status: string, targetScope: string, confirmation: string) {
  return status === "APPROVED" && targetScope === "PROJECT" && confirmation.trim().toUpperCase() === "APPLY";
}
