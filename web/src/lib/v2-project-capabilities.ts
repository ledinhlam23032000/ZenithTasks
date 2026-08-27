export type ProjectMemberPreset = "PROJECT_ADMIN" | "FINANCE" | "INVENTORY" | "SALES" | "VIEWER" | "CUSTOM";

export type ProjectCapability =
  | "workspace.view"
  | "members.manage"
  | "config.manage"
  | "organization.manage"
  | "mechanism.manage"
  | "tasks.manage"
  | "customers.manage"
  | "appointments.manage"
  | "sales.manage"
  | "finance.manage"
  | "payroll.manage";

export type ProjectMembershipLike = { preset: ProjectMemberPreset; permissions?: unknown };

const presetCapabilities: Record<Exclude<ProjectMemberPreset, "CUSTOM">, readonly ProjectCapability[]> = {
  PROJECT_ADMIN: ["workspace.view", "members.manage", "config.manage", "organization.manage", "mechanism.manage", "tasks.manage", "customers.manage", "appointments.manage", "sales.manage", "finance.manage", "payroll.manage"],
  FINANCE: ["workspace.view", "finance.manage", "payroll.manage"],
  INVENTORY: ["workspace.view", "organization.manage", "mechanism.manage"],
  SALES: ["workspace.view", "tasks.manage", "customers.manage", "appointments.manage", "sales.manage"],
  VIEWER: ["workspace.view"],
};

function customPermissions(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { grant: new Set<string>(), deny: new Set<string>() };
  const value = raw as { grant?: unknown; deny?: unknown };
  return {
    grant: new Set(Array.isArray(value.grant) ? value.grant.map(String) : []),
    deny: new Set(Array.isArray(value.deny) ? value.deny.map(String) : []),
  };
}

export function projectMemberCan(membership: ProjectMembershipLike, capability: ProjectCapability) {
  if (membership.preset === "CUSTOM") {
    const permissions = customPermissions(membership.permissions);
    return permissions.grant.has(capability) && !permissions.deny.has(capability);
  }
  return presetCapabilities[membership.preset].includes(capability);
}

const presetVisibleModules: Record<Exclude<ProjectMemberPreset, "CUSTOM">, readonly string[]> = {
  PROJECT_ADMIN: ["organization", "mechanism", "simulation", "tasks", "customers", "appointments", "sales", "finance", "payroll"],
  FINANCE: ["finance", "payroll"],
  INVENTORY: ["organization", "mechanism", "simulation"],
  SALES: ["tasks", "customers", "appointments", "sales"],
  VIEWER: [],
};

export function projectCapabilitiesForPreset(preset: ProjectMemberPreset) {
  return preset === "CUSTOM" ? [] : [...presetCapabilities[preset]];
}

export function projectModuleCanView(membership: ProjectMembershipLike | null | undefined, moduleKey: string) {
  if (!membership) return true;
  if (membership.preset === "CUSTOM") {
    const permissions = customPermissions(membership.permissions);
    return permissions.grant.has(`module:${moduleKey}.view`) && !permissions.deny.has(`module:${moduleKey}.view`);
  }
  return presetVisibleModules[membership.preset].includes(moduleKey);
}
