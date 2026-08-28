import { describe, expect, it } from "vitest";
import { PROJECT_TEMPLATES, getProjectTemplate } from "./v2-project-templates";

describe("V2 Project Templates & Wizard Configuration", () => {
  it("defines all mandatory templates with valid module arrays", () => {
    expect(PROJECT_TEMPLATES.length).toBe(5);
    const ids = PROJECT_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("CLINIC");
    expect(ids).toContain("SALES_TEAM");
    expect(ids).toContain("SERVICE_COMPANY");
    expect(ids).toContain("INVESTMENT_PROJECT");
    expect(ids).toContain("BLANK");
  });

  it("assigns appropriate Lego modules per domain", () => {
    const clinic = getProjectTemplate("CLINIC");
    expect(clinic.defaultModules).toContain("customers");
    expect(clinic.defaultModules).toContain("appointments");
    expect(clinic.defaultModules).toContain("sales");
    expect(clinic.defaultModules).toContain("finance");

    const investment = getProjectTemplate("INVESTMENT_PROJECT");
    expect(investment.defaultModules).not.toContain("appointments");
    expect(investment.defaultModules).toContain("finance");
    expect(investment.defaultModules).toContain("tasks");
  });

  it("provides suggested AI companion prompts per template", () => {
    const sales = getProjectTemplate("SALES_TEAM");
    expect(sales.suggestedAiName).toContain("Kinh doanh");
    expect(sales.suggestedAiPrompt.length).toBeGreaterThan(10);
  });

  it("falls back gracefully for unknown template IDs", () => {
    const fallback = getProjectTemplate("NON_EXISTENT");
    expect(fallback.id).toBe("BLANK");
  });
});
