import { describe, expect, it } from "vitest";
import {
  validateLifecycleTransition,
  guardProjectMutation,
  type ProjectLifecycle,
} from "./v2-project-lifecycle";

describe("v2-project-lifecycle — Organization Lifecycle & Mutation Guard", () => {
  describe("validateLifecycleTransition", () => {
    it("allows DRAFT → ACTIVE", () => {
      expect(validateLifecycleTransition("DRAFT", "ACTIVE")).toEqual({ from: "DRAFT", to: "ACTIVE", ok: true });
    });

    it("allows ACTIVE → SUSPENDED", () => {
      expect(validateLifecycleTransition("ACTIVE", "SUSPENDED")).toEqual({ from: "ACTIVE", to: "SUSPENDED", ok: true });
    });

    it("allows SUSPENDED → ACTIVE (reactivation)", () => {
      expect(validateLifecycleTransition("SUSPENDED", "ACTIVE")).toEqual({ from: "SUSPENDED", to: "ACTIVE", ok: true });
    });

    it("allows ACTIVE → ARCHIVED", () => {
      expect(validateLifecycleTransition("ACTIVE", "ARCHIVED")).toEqual({ from: "ACTIVE", to: "ARCHIVED", ok: true });
    });

    it("rejects ARCHIVED → anything (terminal state)", () => {
      const result = validateLifecycleTransition("ARCHIVED", "ACTIVE");
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("INVALID_TRANSITION");
    });

    it("rejects same-state transition", () => {
      const result = validateLifecycleTransition("ACTIVE", "ACTIVE");
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("SAME_STATE");
    });

    it("rejects DRAFT → SUSPENDED (must go through ACTIVE first)", () => {
      const result = validateLifecycleTransition("DRAFT", "SUSPENDED");
      expect(result.ok).toBe(false);
      expect(result.reason).toContain("INVALID_TRANSITION");
    });
  });

  describe("guardProjectMutation", () => {
    it("allows all operations on ACTIVE projects", () => {
      expect(guardProjectMutation("ACTIVE", "CREATE").allowed).toBe(true);
      expect(guardProjectMutation("ACTIVE", "UPDATE").allowed).toBe(true);
      expect(guardProjectMutation("ACTIVE", "DELETE").allowed).toBe(true);
    });

    it("allows CREATE/UPDATE but blocks DELETE on DRAFT", () => {
      expect(guardProjectMutation("DRAFT", "CREATE").allowed).toBe(true);
      expect(guardProjectMutation("DRAFT", "UPDATE").allowed).toBe(true);
      const del = guardProjectMutation("DRAFT", "DELETE");
      expect(del.allowed).toBe(false);
      expect(del.reason).toBe("DRAFT_NO_DELETE");
    });

    it("blocks all operations on SUSPENDED projects", () => {
      (["CREATE", "UPDATE", "DELETE"] as const).forEach((op) => {
        const result = guardProjectMutation("SUSPENDED", op);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("PROJECT_SUSPENDED");
      });
    });

    it("blocks all operations on ARCHIVED projects permanently", () => {
      (["CREATE", "UPDATE", "DELETE"] as const).forEach((op) => {
        const result = guardProjectMutation("ARCHIVED", op);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("PROJECT_ARCHIVED");
      });
    });
  });
});
