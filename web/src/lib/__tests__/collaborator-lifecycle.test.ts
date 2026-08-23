import { describe, expect, it } from "vitest";
import { collaboratorCanReceiveReferrals, collaboratorLifecycleState } from "@/lib/collaborator-lifecycle";

describe("collaborator lifecycle", () => {
  it("distinguishes active, suspended and archived without deleting identity", () => {
    expect(collaboratorLifecycleState({ active: true, suspendedAt: null, archivedAt: null })).toBe("ACTIVE");
    expect(collaboratorLifecycleState({ active: false, suspendedAt: new Date(), archivedAt: null })).toBe("SUSPENDED");
    expect(collaboratorLifecycleState({ active: false, suspendedAt: null, archivedAt: new Date() })).toBe("ARCHIVED");
  });

  it("only allows active, non-archived profiles to receive new referrals", () => {
    expect(collaboratorCanReceiveReferrals({ active: true, archivedAt: null })).toBe(true);
    expect(collaboratorCanReceiveReferrals({ active: false, archivedAt: null })).toBe(false);
    expect(collaboratorCanReceiveReferrals({ active: true, archivedAt: new Date() })).toBe(false);
  });
});
