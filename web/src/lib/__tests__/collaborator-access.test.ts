import { describe, expect, it } from "vitest";
import { collaboratorCutoff, collaboratorOwnsCustomer } from "../collaborator-access";

describe("collaborator access", () => {
  it("uses a six-month cutoff", () => {
    const cutoff = collaboratorCutoff(new Date("2026-08-21T00:00:00Z"));
    expect(cutoff.toISOString().slice(0, 10)).toBe("2026-02-21");
  });

  it("requires owner identity and a recent assignment", () => {
    const now = new Date("2026-08-21T00:00:00Z");
    expect(collaboratorOwnsCustomer({ collaboratorId: "ctv-1", collaboratorAssignedAt: new Date("2026-03-01T00:00:00Z") }, "ctv-1", now)).toBe(true);
    expect(collaboratorOwnsCustomer({ collaboratorId: "ctv-2", collaboratorAssignedAt: new Date("2026-03-01T00:00:00Z") }, "ctv-1", now)).toBe(false);
    expect(collaboratorOwnsCustomer({ collaboratorId: "ctv-1", collaboratorAssignedAt: new Date("2026-02-20T00:00:00Z") }, "ctv-1", now)).toBe(false);
  });
});
