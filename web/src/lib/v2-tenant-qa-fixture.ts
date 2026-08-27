import { projectMemberCan, type ProjectCapability, type ProjectMemberPreset } from "./v2-project-capabilities";

export type QaProjectStatus = "DRAFT" | "ACTIVE" | "ARCHIVED";
export type QaUserRole = "ADMIN" | "COLLABORATOR";

export type QaProject = {
  id: string;
  name: string;
  status: QaProjectStatus;
};

export type QaUser = {
  id: string;
  role: QaUserRole;
};

export type QaMembership = {
  userId: string;
  projectId: string;
  active: boolean;
  preset: ProjectMemberPreset;
};

export type QaCustomer = {
  id: string;
  projectId: string;
  label: string;
};

export const QA_PROJECTS: readonly QaProject[] = [
  { id: "qa-company-a", name: "QA Company A", status: "ACTIVE" },
  { id: "qa-company-b", name: "QA Company B", status: "ACTIVE" },
  { id: "qa-company-draft", name: "QA Company Draft", status: "DRAFT" },
  { id: "qa-company-archived", name: "QA Company Archived", status: "ARCHIVED" },
];

export const QA_USERS: readonly QaUser[] = [
  { id: "qa-global-admin", role: "ADMIN" },
  { id: "qa-project-admin-a", role: "COLLABORATOR" },
  { id: "qa-project-admin-b", role: "COLLABORATOR" },
  { id: "qa-sales-a", role: "COLLABORATOR" },
  { id: "qa-finance-a", role: "COLLABORATOR" },
  { id: "qa-viewer-b", role: "COLLABORATOR" },
];

export const QA_MEMBERSHIPS: readonly QaMembership[] = [
  { userId: "qa-project-admin-a", projectId: "qa-company-a", active: true, preset: "PROJECT_ADMIN" },
  { userId: "qa-project-admin-b", projectId: "qa-company-b", active: true, preset: "PROJECT_ADMIN" },
  { userId: "qa-sales-a", projectId: "qa-company-a", active: true, preset: "SALES" },
  { userId: "qa-finance-a", projectId: "qa-company-a", active: true, preset: "FINANCE" },
  { userId: "qa-viewer-b", projectId: "qa-company-b", active: true, preset: "VIEWER" },
];

export const QA_CUSTOMERS: readonly QaCustomer[] = [
  { id: "qa-customer-a-001", projectId: "qa-company-a", label: "Synthetic customer A-001" },
  { id: "qa-customer-a-002", projectId: "qa-company-a", label: "Synthetic customer A-002" },
  { id: "qa-customer-b-001", projectId: "qa-company-b", label: "Synthetic customer B-001" },
  { id: "qa-customer-draft-001", projectId: "qa-company-draft", label: "Synthetic customer Draft-001" },
  { id: "qa-customer-archived-001", projectId: "qa-company-archived", label: "Synthetic customer Archived-001" },
];

function projectOf(projectId: string) {
  return QA_PROJECTS.find((project) => project.id === projectId);
}

function membershipOf(userId: string, projectId: string) {
  return QA_MEMBERSHIPS.find((membership) => membership.userId === userId && membership.projectId === projectId && membership.active);
}

function userOf(userId: string) {
  return QA_USERS.find((user) => user.id === userId);
}

export function qaCanOpenProject(userId: string, projectId: string) {
  const user = userOf(userId);
  const project = projectOf(projectId);
  if (!user || !project || project.status === "ARCHIVED") return false;
  return user.role === "ADMIN" || Boolean(membershipOf(userId, projectId));
}

export function qaCanWriteProject(userId: string, projectId: string, capability: ProjectCapability) {
  const project = projectOf(projectId);
  if (!project || project.status !== "ACTIVE") return false;
  const user = userOf(userId);
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const membership = membershipOf(userId, projectId);
  return Boolean(membership && projectMemberCan(membership, capability));
}

export function qaVisibleCustomers(userId: string, projectId: string) {
  if (!qaCanOpenProject(userId, projectId)) return [];
  return QA_CUSTOMERS.filter((customer) => customer.projectId === projectId);
}

export function qaGlobalCustomerAggregate(userId: string) {
  const user = userOf(userId);
  if (!user || user.role !== "ADMIN") return [];
  return QA_CUSTOMERS.filter((customer) => projectOf(customer.projectId)?.status === "ACTIVE");
}

export function qaExportCustomers(userId: string, projectId: string) {
  return qaVisibleCustomers(userId, projectId).map(({ id, projectId: ownerProjectId, label }) => ({ id, projectId: ownerProjectId, label }));
}
