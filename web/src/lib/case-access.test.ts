import { describe, expect, it } from "vitest";
import { canAccessCase } from "./case-access";

const baseCase = { consultantId: "consultant-1", doctorId: "doctor-1" };

describe("canAccessCase", () => {
  it("keeps a consultant inside cases assigned to that consultant", () => {
    expect(canAccessCase({ id: "consultant-1", role: "CONSULTANT", permissions: null }, baseCase, "read")).toBe(true);
    expect(canAccessCase({ id: "consultant-2", role: "CONSULTANT", permissions: null }, baseCase, "read")).toBe(false);
  });

  it("keeps a doctor inside cases assigned to that doctor", () => {
    expect(canAccessCase({ id: "doctor-1", role: "DOCTOR", permissions: null }, baseCase, "clinical")).toBe(true);
    expect(canAccessCase({ id: "doctor-2", role: "DOCTOR", permissions: null }, baseCase, "clinical")).toBe(false);
  });

  it("allows reception to add payment but not change clinical data", () => {
    const user = { id: "reception-1", role: "RECEPTION" as const, permissions: null };
    expect(canAccessCase(user, baseCase, "payment.add")).toBe(true);
    expect(canAccessCase(user, baseCase, "clinical")).toBe(false);
  });
});
