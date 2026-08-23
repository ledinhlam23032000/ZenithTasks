export type CollaboratorLifecycleState = "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export function collaboratorLifecycleState(input: { active: boolean; suspendedAt: Date | string | null; archivedAt: Date | string | null }): CollaboratorLifecycleState {
  if (input.archivedAt) return "ARCHIVED";
  if (!input.active || input.suspendedAt) return "SUSPENDED";
  return "ACTIVE";
}

export function collaboratorCanReceiveReferrals(input: { active: boolean; archivedAt: Date | string | null }): boolean {
  return input.active && !input.archivedAt;
}
