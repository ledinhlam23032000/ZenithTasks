import { describe, expect, it } from "vitest";
import { getCaseWorkspace } from "./case-workspace";

describe("case workspace presets", () => {
  it("gives admin the complete workspace", () => {
    const workspace = getCaseWorkspace("ADMIN");
    expect(workspace.key).toBe("admin");
    expect(workspace.visibleTabs).toContain("phan-bo-doanh-so");
    expect(workspace.showFinancialRail).toBe(true);
    expect(workspace.defaultTab).toBe("giay-to");
  });

  it("separates clinical and reception views", () => {
    const clinical = getCaseWorkspace("DOCTOR");
    const reception = getCaseWorkspace("RECEPTION");
    expect(clinical.defaultTab).toBe("giay-to");
    expect(clinical.visibleTabs).toContain("vat-tu");
    expect(clinical.visibleTabs).not.toContain("phan-bo-doanh-so");
    expect(clinical.showFinancialRail).toBe(false);
    expect(reception.defaultTab).toBe("dich-vu");
    expect(reception.visibleTabs).not.toContain("tu-van");
    expect(reception.showFinancialRail).toBe(true);
  });

  it("uses a readonly safe presentation for non-operational roles", () => {
    const workspace = getCaseWorkspace("SHAREHOLDER");
    expect(workspace.key).toBe("readonly");
    expect(workspace.showFinancialRail).toBe(false);
    expect(workspace.visibleTabs).not.toContain("phan-bo-doanh-so");
  });
});
