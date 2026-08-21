import { describe, expect, it } from "vitest";
import { buildStaffHandoffChecklist, handoffHasBlockers } from "./staff-handoff";

describe("staff handoff checklist", () => {
  it("flags active workload before retirement", () => {
    const items = buildStaffHandoffChecklist({ customers: 2, appointments: 0, clinicalCases: 1, careMessages: 0, followUps: 0, plans: 0 });
    expect(handoffHasBlockers(items)).toBe(true);
    expect(items.find((item) => item.key === "customers")?.blocking).toBe(true);
  });

  it("allows a clean retirement checklist when no workload remains", () => {
    const items = buildStaffHandoffChecklist({ customers: 0, appointments: 0, clinicalCases: 0, careMessages: 0, followUps: 0, plans: 0 });
    expect(handoffHasBlockers(items)).toBe(false);
    expect(items.every((item) => item.count === 0)).toBe(true);
  });
});
