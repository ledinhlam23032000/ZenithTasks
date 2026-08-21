import { describe, expect, it } from "vitest";
import { buildCaseReadinessBadges } from "./case-readiness";

describe("case readiness badges", () => {
  it("marks missing clinical confirmation and consent as blocking", () => {
    const badges = buildCaseReadinessBadges({
      consultationExists: false,
      patientConfirmed: false,
      serviceCount: 1,
      materialUsageCount: 0,
      consentCount: 0,
      documentCount: 0,
      debt: 100,
      followUpCount: 0,
    });
    expect(badges.find((b) => b.key === "tu-van")?.blocking).toBe(true);
    expect(badges.filter((b) => b.key === "giay-to").some((b) => b.blocking)).toBe(true);
    expect(badges.find((b) => b.key === "vat-tu")?.blocking).toBe(false);
  });

  it("returns no badges for a complete and settled case", () => {
    expect(buildCaseReadinessBadges({
      consultationExists: true,
      patientConfirmed: true,
      serviceCount: 2,
      materialUsageCount: 1,
      consentCount: 1,
      documentCount: 1,
      debt: 0,
      followUpCount: 1,
    })).toEqual([]);
  });
});
