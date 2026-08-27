import { describe, expect, it } from "vitest";
import { canTransitionProjectStatus, projectAcceptsOperationalWrites, transitionProjectStatus } from "./v2-project-lifecycle";

describe("project lifecycle", () => {
  it("creates companies in a non-operational draft state until activated", () => {
    expect(projectAcceptsOperationalWrites("DRAFT")).toBe(false);
    expect(projectAcceptsOperationalWrites("ACTIVE")).toBe(true);
    expect(projectAcceptsOperationalWrites("ARCHIVED")).toBe(false);
  });

  it("allows draft activation and active archival, with restore only through active transition", () => {
    expect(canTransitionProjectStatus("DRAFT", "ACTIVE")).toBe(true);
    expect(canTransitionProjectStatus("ACTIVE", "ARCHIVED")).toBe(true);
    expect(canTransitionProjectStatus("ARCHIVED", "ACTIVE")).toBe(true);
    expect(canTransitionProjectStatus("ARCHIVED", "DRAFT")).toBe(false);
  });

  it("rejects self-transitions", () => {
    expect(transitionProjectStatus("ACTIVE", "ACTIVE")).toEqual({ ok: false, error: "Dự án đã ở trạng thái này." });
  });
});
