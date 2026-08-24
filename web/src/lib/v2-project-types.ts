export const PROJECT_TYPES = ["INTERNAL_CLINIC", "DISTRIBUTION", "PARTNERSHIP", "SERVICE", "OTHER"] as const;

export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  INTERNAL_CLINIC: "Nội bộ clinic",
  DISTRIBUTION: "Phân phối",
  PARTNERSHIP: "Hợp tác",
  SERVICE: "Dịch vụ",
  OTHER: "Khác",
};
