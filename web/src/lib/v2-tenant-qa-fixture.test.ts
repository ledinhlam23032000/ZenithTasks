import { describe, expect, it } from "vitest";
import {
  QA_CUSTOMERS,
  qaCanOpenProject,
  qaCanWriteProject,
  qaExportCustomers,
  qaGlobalCustomerAggregate,
  qaVisibleCustomers,
} from "./v2-tenant-qa-fixture";

describe("two-company tenant isolation QA fixture", () => {
  it("keeps company A customer list and export inside company A", () => {
    expect(qaVisibleCustomers("qa-project-admin-a", "qa-company-a").map((row) => row.id)).toEqual(["qa-customer-a-001", "qa-customer-a-002"]);
    expect(qaExportCustomers("qa-sales-a", "qa-company-a").every((row) => row.projectId === "qa-company-a")).toBe(true);
    expect(qaExportCustomers("qa-sales-a", "qa-company-a").some((row) => row.projectId === "qa-company-b")).toBe(false);
  });

  it("denies foreign direct URL access and revoked membership", () => {
    expect(qaCanOpenProject("qa-project-admin-a", "qa-company-b")).toBe(false);
    expect(qaVisibleCustomers("qa-project-admin-a", "qa-company-b")).toEqual([]);
    expect(qaCanOpenProject("qa-viewer-b", "qa-company-a")).toBe(false);
  });

  it("gives Global Admin only the bounded active-company aggregate", () => {
    const aggregate = qaGlobalCustomerAggregate("qa-global-admin");
    expect(aggregate).toEqual(QA_CUSTOMERS.filter((customer) => customer.projectId === "qa-company-a" || customer.projectId === "qa-company-b"));
    expect(aggregate.some((row) => row.projectId === "qa-company-draft")).toBe(false);
    expect(aggregate.some((row) => row.projectId === "qa-company-archived")).toBe(false);
    expect(qaGlobalCustomerAggregate("qa-project-admin-a")).toEqual([]);
  });

  it("blocks writes for DRAFT/ARCHIVED and respects membership capabilities", () => {
    expect(qaCanWriteProject("qa-project-admin-a", "qa-company-draft", "customers.manage")).toBe(false);
    expect(qaCanWriteProject("qa-project-admin-a", "qa-company-archived", "customers.manage")).toBe(false);
    expect(qaCanWriteProject("qa-sales-a", "qa-company-a", "customers.manage")).toBe(true);
    expect(qaCanWriteProject("qa-sales-a", "qa-company-a", "finance.manage")).toBe(false);
    expect(qaCanWriteProject("qa-finance-a", "qa-company-a", "finance.manage")).toBe(true);
    expect(qaCanWriteProject("qa-viewer-b", "qa-company-b", "customers.manage")).toBe(false);
  });
});
