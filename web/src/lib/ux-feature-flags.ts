export type UxFeature = "case-readiness" | "payment-source-requests" | "inbox-alternatives" | "collaborator-id-reconcile" | "mobile-workload-bar";

const FEATURES: readonly UxFeature[] = ["case-readiness", "payment-source-requests", "inbox-alternatives", "collaborator-id-reconcile", "mobile-workload-bar"];

function rolloutSet(): Set<string> {
  const raw = process.env.UX_ROLLOUT ?? "all";
  if (raw.trim().toLowerCase() === "all") return new Set(FEATURES);
  return new Set(raw.split(",").map((value) => value.trim()).filter(Boolean));
}

export function isUxFeatureEnabled(feature: UxFeature): boolean {
  return rolloutSet().has(feature);
}

export function uxRolloutSnapshot(): Record<UxFeature, boolean> {
  return Object.fromEntries(FEATURES.map((feature) => [feature, isUxFeatureEnabled(feature)])) as Record<UxFeature, boolean>;
}
