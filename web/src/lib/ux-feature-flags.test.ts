import { describe, expect, it } from "vitest";
import { isUxFeatureEnabled, uxRolloutSnapshot } from "./ux-feature-flags";

describe("UX feature flags", () => {
  it("enables the approved UX set by default", () => {
    expect(isUxFeatureEnabled("case-readiness")).toBe(true);
    expect(isUxFeatureEnabled("mobile-workload-bar")).toBe(true);
    expect(Object.keys(uxRolloutSnapshot())).toHaveLength(5);
  });
});
