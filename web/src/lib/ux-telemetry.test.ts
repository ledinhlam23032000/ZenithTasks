import { describe, expect, it } from "vitest";
import { sanitizeUxTelemetry, telemetryStorageKey } from "./ux-telemetry";

describe("UX telemetry", () => {
  it("keeps only non-PII workflow metrics", () => {
    const payload = { workflow: "reception", step: "search", durationMs: 1200, surface: "mobile", customerName: "hidden" } as unknown as Parameters<typeof sanitizeUxTelemetry>[0];
    expect(sanitizeUxTelemetry(payload)).toEqual({ workflow: "reception", step: "search", durationMs: 1200, surface: "mobile" });
  });

  it("uses stable event storage keys", () => {
    expect(telemetryStorageKey("next_action_click")).toBe("ux-telemetry:next_action_click");
  });
});
