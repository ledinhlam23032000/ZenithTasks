import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { PrismaClient } from "../../src/generated/prisma/client";

const qaUrl = process.env.QA_DATABASE_URL?.trim();
if (!qaUrl) throw new Error("Refusing QA seed: set QA_DATABASE_URL to a dedicated non-clinic database.");
if (process.env.QA_CONFIRM !== "YES") throw new Error("Refusing QA seed: set QA_CONFIRM=YES explicitly.");
if (/(clinic|production|trungtam|hongphuc)/i.test(qaUrl)) throw new Error("Refusing QA seed: the database URL looks like a clinic/production database.");

const password = process.env.QA_DEMO_PASSWORD ?? "";
if (password.length < 12) throw new Error("QA_DEMO_PASSWORD must be supplied from the QA environment and be at least 12 characters.");

const adapter = new PrismaPg({ connectionString: qaUrl });
const prisma = new PrismaClient({ adapter });
const passwordHash = await bcrypt.hash(password, 12);

const users = [
  { id: "qa-global-admin", code: "QA-ADMIN", username: "qa.global.admin", fullName: "QA Global Admin", role: "ADMIN" as const },
  { id: "qa-project-admin-a", code: "QA-ADMIN-A", username: "qa.project.admin.a", fullName: "QA Project Admin A", role: "COLLABORATOR" as const },
  { id: "qa-project-admin-b", code: "QA-ADMIN-B", username: "qa.project.admin.b", fullName: "QA Project Admin B", role: "COLLABORATOR" as const },
  { id: "qa-sales-a", code: "QA-SALES-A", username: "qa.sales.a", fullName: "QA Sales A", role: "COLLABORATOR" as const },
  { id: "qa-finance-a", code: "QA-FINANCE-A", username: "qa.finance.a", fullName: "QA Finance A", role: "COLLABORATOR" as const },
  { id: "qa-viewer-b", code: "QA-VIEWER-B", username: "qa.viewer.b", fullName: "QA Viewer B", role: "COLLABORATOR" as const },
  { id: "qa-revoked-a", code: "QA-REVOKED-A", username: "qa.revoked.a", fullName: "QA Revoked A", role: "COLLABORATOR" as const },
];

const projects = [
  { id: "qa-company-a", code: "QA-COMPANY-A", name: "QA Company A", status: "ACTIVE" as const },
  { id: "qa-company-b", code: "QA-COMPANY-B", name: "QA Company B", status: "ACTIVE" as const },
  { id: "qa-company-draft", code: "QA-COMPANY-DRAFT", name: "QA Company Draft", status: "DRAFT" as const },
  { id: "qa-company-archived", code: "QA-COMPANY-ARCHIVED", name: "QA Company Archived", status: "ARCHIVED" as const },
];

const memberships = [
  { projectId: "qa-company-a", userId: "qa-project-admin-a", preset: "PROJECT_ADMIN" as const, active: true },
  { projectId: "qa-company-b", userId: "qa-project-admin-b", preset: "PROJECT_ADMIN" as const, active: true },
  { projectId: "qa-company-a", userId: "qa-sales-a", preset: "SALES" as const, active: true },
  { projectId: "qa-company-a", userId: "qa-finance-a", preset: "FINANCE" as const, active: true },
  { projectId: "qa-company-b", userId: "qa-viewer-b", preset: "VIEWER" as const, active: true },
  { projectId: "qa-company-a", userId: "qa-revoked-a", preset: "VIEWER" as const, active: false },
];

async function main() {
  for (const user of users) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { code: user.code, username: user.username, fullName: user.fullName, role: user.role, passwordHash, mustChangePassword: true, active: true },
      create: { ...user, passwordHash, mustChangePassword: true, active: true },
    });
  }
  for (const project of projects) {
    await prisma.zProject.upsert({
      where: { id: project.id },
      update: { code: project.code, name: project.name, status: project.status, ownerUserId: "qa-global-admin", enabledFeatures: ["organization", "tasks", "customers", "appointments", "sales", "finance", "payroll"] },
      create: { ...project, ownerUserId: "qa-global-admin", enabledFeatures: ["organization", "tasks", "customers", "appointments", "sales", "finance", "payroll"] },
    });
  }
  for (const membership of memberships) {
    await prisma.zProjectMember.upsert({
      where: { projectId_userId: { projectId: membership.projectId, userId: membership.userId } },
      update: { preset: membership.preset, active: membership.active, leftAt: membership.active ? null : new Date("2026-01-01T00:00:00.000Z") },
      create: { ...membership, leftAt: membership.active ? null : new Date("2026-01-01T00:00:00.000Z") },
    });
  }
  for (const project of projects) {
    await prisma.zAiAgent.upsert({
      where: { id: `qa-agent-child-${project.id}` },
      update: { code: `QA-CHILD-${project.code}`, name: `QA Child ${project.code}`, kind: "CHILD", status: project.status === "ACTIVE" ? "ACTIVE" : "DRAFT", projectId: project.id, createdById: "qa-global-admin", systemPrompt: "Synthetic QA child agent restricted to this company only.", toolAllowlist: ["get_project_overview", "get_project_customers", "get_project_tasks"], config: { qa: true, projectId: project.id } },
      create: { id: `qa-agent-child-${project.id}`, code: `QA-CHILD-${project.code}`, name: `QA Child ${project.code}`, kind: "CHILD", status: project.status === "ACTIVE" ? "ACTIVE" : "DRAFT", projectId: project.id, createdById: "qa-global-admin", systemPrompt: "Synthetic QA child agent restricted to this company only.", toolAllowlist: ["get_project_overview", "get_project_customers", "get_project_tasks"], config: { qa: true, projectId: project.id } },
    });
  }
  await prisma.zAiAgent.upsert({
    where: { id: "qa-agent-global" },
    update: { code: "QA-GLOBAL", name: "QA Global AI", kind: "GLOBAL", status: "ACTIVE", projectId: null, createdById: "qa-global-admin", systemPrompt: "Synthetic QA global agent limited to aggregate and explicit targets.", toolAllowlist: ["get_workspace_overview"], config: { qa: true, scope: "GLOBAL", requiresExplicitProjectTarget: true } },
    create: { id: "qa-agent-global", code: "QA-GLOBAL", name: "QA Global AI", kind: "GLOBAL", status: "ACTIVE", projectId: null, createdById: "qa-global-admin", systemPrompt: "Synthetic QA global agent limited to aggregate and explicit targets.", toolAllowlist: ["get_workspace_overview"], config: { qa: true, scope: "GLOBAL", requiresExplicitProjectTarget: true } },
  });
  for (const project of projects) {
    for (const suffix of ["001", "002"]) {
      await prisma.zWorkspaceCustomer.upsert({
        where: { projectId_code: { projectId: project.id, code: `QA-${project.code}-${suffix}` } },
        update: { fullName: `Synthetic ${project.code} Customer ${suffix}`, phoneLast4: suffix.slice(-4), source: "QA", note: "NON-PII synthetic fixture", active: true, deletedAt: null, deletedById: null, createdById: "qa-global-admin" },
        create: { projectId: project.id, code: `QA-${project.code}-${suffix}`, fullName: `Synthetic ${project.code} Customer ${suffix}`, phoneLast4: suffix.slice(-4), source: "QA", note: "NON-PII synthetic fixture", createdById: "qa-global-admin" },
      });
    }
  }
  for (const project of projects) {
    for (const suffix of ["001", "002"]) {
      await prisma.zWorkspaceTask.upsert({
        where: { id: `qa-task-${project.id}-${suffix}` },
        update: { projectId: project.id, title: `Synthetic ${project.code} Task ${suffix}`, description: "NON-PII synthetic fixture", priority: "NORMAL", status: "TODO", order: Number(suffix), createdById: "qa-global-admin", assigneeId: null },
        create: { id: `qa-task-${project.id}-${suffix}`, projectId: project.id, title: `Synthetic ${project.code} Task ${suffix}`, description: "NON-PII synthetic fixture", priority: "NORMAL", status: "TODO", order: Number(suffix), createdById: "qa-global-admin" },
      });
    }
  }
  console.log(JSON.stringify({ ok: true, qaOnly: true, users: users.length, projects: projects.length, memberships: memberships.length, agents: projects.length + 1, customers: projects.length * 2, tasks: projects.length * 2 }, null, 2));
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
