import { describe, expect, it } from "vitest";
import {
  injectTenantFilter,
  assertRecordBelongsToTenant,
  assertMutationTenantSafe,
  type TenantContext,
} from "./v2-tenant-extension";

describe("v2-tenant-extension — Prisma Tenant Isolation", () => {
  const tenantA: TenantContext = { projectId: "project-alpha" };
  const tenantBypass: TenantContext = { projectId: "project-alpha", bypassTenantFilter: true };

  describe("injectTenantFilter", () => {
    it("injects projectId into where clause for tenant-scoped models", () => {
      const args = { where: { status: "ACTIVE" } };
      const result = injectTenantFilter(args, "ZWorkspaceTask", tenantA);
      expect(result.where).toEqual({ status: "ACTIVE", projectId: "project-alpha" });
    });

    it("throws TENANT_ISOLATION_VIOLATION if caller tries to access different projectId", () => {
      const args = { where: { projectId: "project-beta" } };
      expect(() => injectTenantFilter(args, "ZWorkspaceCustomer", tenantA)).toThrow(
        "TENANT_ISOLATION_VIOLATION"
      );
    });

    it("passes through non-tenant-scoped models without modification", () => {
      const args = { where: { email: "test@test.com" } };
      const result = injectTenantFilter(args, "User", tenantA);
      expect(result.where).toEqual({ email: "test@test.com" });
    });

    it("bypasses filter when bypassTenantFilter is true", () => {
      const args = { where: { projectId: "project-beta" } };
      const result = injectTenantFilter(args, "ZWorkspaceTask", tenantBypass);
      expect(result.where).toEqual({ projectId: "project-beta" }); // No throw, no override
    });

    it("creates where clause if none provided", () => {
      const args: { where?: Record<string, unknown> } = {};
      const result = injectTenantFilter(args, "ZWorkspaceSale", tenantA);
      expect(result.where).toEqual({ projectId: "project-alpha" });
    });
  });

  describe("assertRecordBelongsToTenant", () => {
    it("passes for record with matching projectId", () => {
      expect(() =>
        assertRecordBelongsToTenant({ id: "1", projectId: "project-alpha" }, tenantA, "ZWorkspaceTask")
      ).not.toThrow();
    });

    it("throws for record with different projectId", () => {
      expect(() =>
        assertRecordBelongsToTenant({ id: "1", projectId: "project-beta" }, tenantA, "ZWorkspaceTask")
      ).toThrow("TENANT_ISOLATION_VIOLATION");
    });

    it("passes for null record", () => {
      expect(() => assertRecordBelongsToTenant(null, tenantA, "ZWorkspaceTask")).not.toThrow();
    });

    it("passes for non-tenant-scoped model", () => {
      expect(() =>
        assertRecordBelongsToTenant({ id: "1", projectId: "project-beta" }, tenantA, "User")
      ).not.toThrow();
    });
  });

  describe("assertMutationTenantSafe", () => {
    it("auto-injects projectId on create when missing", () => {
      const data: Record<string, unknown> = { title: "Test" };
      assertMutationTenantSafe(data, tenantA, "ZWorkspaceTask", "create");
      expect(data.projectId).toBe("project-alpha");
    });

    it("throws on create with wrong projectId", () => {
      expect(() =>
        assertMutationTenantSafe({ projectId: "project-beta" }, tenantA, "ZWorkspaceTask", "create")
      ).toThrow("TENANT_ISOLATION_VIOLATION");
    });

    it("throws on update with wrong projectId", () => {
      expect(() =>
        assertMutationTenantSafe({ projectId: "project-beta" }, tenantA, "ZWorkspaceCustomer", "update")
      ).toThrow("TENANT_ISOLATION_VIOLATION");
    });
  });
});
