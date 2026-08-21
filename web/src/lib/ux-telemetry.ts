export type UxTelemetryEvent = "workflow_start" | "workflow_step" | "workflow_complete" | "workflow_abandon" | "next_action_click";

export type UxTelemetryPayload = {
  workflow: string;
  step?: string;
  durationMs?: number;
  stepCount?: number;
  surface?: string;
};

const ALLOWED_KEYS = new Set(["workflow", "step", "durationMs", "stepCount", "surface"]);

export function sanitizeUxTelemetry(payload: UxTelemetryPayload): UxTelemetryPayload {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (ALLOWED_KEYS.has(key) && (typeof value === "string" || typeof value === "number")) safe[key] = value;
  }
  return safe as UxTelemetryPayload;
}

export function telemetryStorageKey(event: UxTelemetryEvent): string {
  return `ux-telemetry:${event}`;
}
