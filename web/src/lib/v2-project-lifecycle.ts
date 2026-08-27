export type ProjectLifecycleStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";

const transitions: Record<ProjectLifecycleStatus, readonly ProjectLifecycleStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["ARCHIVED"],
  ARCHIVED: ["ACTIVE"],
};

export function canTransitionProjectStatus(from: ProjectLifecycleStatus, to: ProjectLifecycleStatus) {
  return from !== to && transitions[from].includes(to);
}

export function transitionProjectStatus(from: ProjectLifecycleStatus, to: ProjectLifecycleStatus): { ok: true } | { ok: false; error: string } {
  if (from === to) return { ok: false, error: "Dự án đã ở trạng thái này." };
  if (!canTransitionProjectStatus(from, to)) return { ok: false, error: `Không thể chuyển Dự án từ ${from} sang ${to}.` };
  return { ok: true };
}

export function projectAcceptsOperationalWrites(status: ProjectLifecycleStatus) {
  return status === "ACTIVE";
}
