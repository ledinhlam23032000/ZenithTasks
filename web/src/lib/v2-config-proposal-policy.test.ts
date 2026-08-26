import { describe, expect, it } from "vitest";
import { canApplyWorkspaceProposal, isSafeWorkspaceProposalRisk } from "./v2-config-proposal-policy";

describe("workspace config proposal policy", () => {
  it("allows only L1-L4 and fails closed for L5/unknown", () => {
    expect(isSafeWorkspaceProposalRisk("L1")).toBe(true);
    expect(isSafeWorkspaceProposalRisk("L4")).toBe(true);
    expect(isSafeWorkspaceProposalRisk("L5")).toBe(false);
    expect(isSafeWorkspaceProposalRisk("danger")).toBe(false);
  });

  it("requires approved project target and typed APPLY", () => {
    expect(canApplyWorkspaceProposal("APPROVED", "PROJECT", "APPLY")).toBe(true);
    expect(canApplyWorkspaceProposal("DRAFT", "PROJECT", "APPLY")).toBe(false);
    expect(canApplyWorkspaceProposal("APPROVED", "GLOBAL", "APPLY")).toBe(false);
    expect(canApplyWorkspaceProposal("APPROVED", "PROJECT", "")).toBe(false);
  });
});
