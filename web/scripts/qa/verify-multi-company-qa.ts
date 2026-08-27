import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../../src/generated/prisma/client";

const qaUrl = process.env.QA_DATABASE_URL?.trim();
if (!qaUrl) throw new Error("Refusing QA verification: set QA_DATABASE_URL to a dedicated non-clinic database.");
if (process.env.QA_CONFIRM !== "YES") throw new Error("Refusing QA verification: set QA_CONFIRM=YES explicitly.");
if (/(clinic|production|trungtam|hongphuc)/i.test(qaUrl)) throw new Error("Refusing QA verification: the database URL looks like a clinic/production database.");

const adapter = new PrismaPg({ connectionString: qaUrl });
const prisma = new PrismaClient({ adapter });

function assertCheck(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

async function main() {
  const projects = await prisma.zProject.findMany({
    where: { code: { startsWith: "QA-COMPANY-" } },
    select: { id: true, code: true, status: true },
    orderBy: { code: "asc" },
  });
  const projectIds = new Set(projects.map((project) => project.id));
  const activeProjects = projects.filter((project) => project.status === "ACTIVE");
  assertCheck(projects.length >= 4, `Expected at least 4 QA company sentinels, found ${projects.length}.`);
  assertCheck(activeProjects.some((project) => project.code === "QA-COMPANY-A"), "QA Company A is not ACTIVE.");
  assertCheck(activeProjects.some((project) => project.code === "QA-COMPANY-B"), "QA Company B is not ACTIVE.");
  assertCheck(projects.some((project) => project.code === "QA-COMPANY-DRAFT" && project.status === "DRAFT"), "DRAFT sentinel missing.");
  assertCheck(projects.some((project) => project.code === "QA-COMPANY-ARCHIVED" && project.status === "ARCHIVED"), "ARCHIVED sentinel missing.");

  const users = await prisma.user.findMany({ where: { username: { startsWith: "qa." } }, select: { id: true, username: true, role: true, mustChangePassword: true, active: true } });
  const memberships = await prisma.zProjectMember.findMany({ where: { projectId: { in: [...projectIds] } }, select: { projectId: true, userId: true, preset: true, active: true } });
  const customers = await prisma.zWorkspaceCustomer.findMany({ where: { projectId: { in: [...projectIds] } }, select: { id: true, projectId: true, code: true, active: true } });
  const tasks = await prisma.zWorkspaceTask.findMany({ where: { projectId: { in: [...projectIds] } }, select: { id: true, projectId: true, title: true } });
  const agents = await prisma.zAiAgent.findMany({ where: { projectId: { in: [...projectIds] } }, select: { id: true, kind: true, status: true, projectId: true, toolAllowlist: true } });
  const globalAgents = await prisma.zAiAgent.findMany({ where: { kind: "GLOBAL" }, select: { id: true, status: true, projectId: true, toolAllowlist: true } });

  const qaUsernames = new Set(users.map((user) => user.username));
  assertCheck(["qa.global.admin", "qa.project.admin.a", "qa.project.admin.b", "qa.sales.a", "qa.finance.a", "qa.viewer.b", "qa.revoked.a"].every((username) => qaUsernames.has(username)), "One or more required QA users are missing.");
  assertCheck(users.every((user) => user.active && user.mustChangePassword), "QA users must be active and require first-login password change.");
  assertCheck(memberships.some((membership) => membership.userId === "qa-revoked-a" && membership.projectId === "qa-company-a" && !membership.active), "Revoked membership sentinel missing.");
  assertCheck(memberships.some((membership) => membership.userId === "qa-sales-a" && membership.projectId === "qa-company-a" && membership.preset === "SALES" && membership.active), "Sales A membership contract missing.");
  assertCheck(memberships.some((membership) => membership.userId === "qa-finance-a" && membership.projectId === "qa-company-a" && membership.preset === "FINANCE" && membership.active), "Finance A membership contract missing.");
  assertCheck(memberships.some((membership) => membership.userId === "qa-viewer-b" && membership.projectId === "qa-company-b" && membership.preset === "VIEWER" && membership.active), "Viewer B membership contract missing.");

  assertCheck(customers.every((customer) => projectIds.has(customer.projectId)), "A customer references a project outside the QA fixture set.");
  assertCheck(tasks.every((task) => projectIds.has(task.projectId)), "A task references a project outside the QA fixture set.");
  for (const project of activeProjects.filter((item) => item.code === "QA-COMPANY-A" || item.code === "QA-COMPANY-B")) {
    assertCheck(customers.filter((customer) => customer.projectId === project.id && customer.active).length >= 2, `${project.code} lacks two active customers.`);
    assertCheck(tasks.filter((task) => task.projectId === project.id).length >= 2, `${project.code} lacks two tasks.`);
  }

  const activeChildren = agents.filter((agent) => agent.kind === "CHILD" && agent.status === "ACTIVE");
  assertCheck(activeChildren.length === activeProjects.filter((project) => project.code === "QA-COMPANY-A" || project.code === "QA-COMPANY-B").length, "Expected exactly one ACTIVE child agent for each active A/B company.");
  assertCheck(activeChildren.every((agent) => agent.projectId && projectIds.has(agent.projectId)), "An ACTIVE child agent has no valid QA project.");
  assertCheck(activeChildren.every((agent) => Array.isArray(agent.toolAllowlist) && (agent.toolAllowlist as unknown[]).every((tool) => ["get_project_overview", "get_project_customers", "get_project_tasks"].includes(String(tool)))), "A child agent has a tool outside the project-local read allowlist.");
  const activeGlobals = globalAgents.filter((agent) => agent.status === "ACTIVE");
  assertCheck(activeGlobals.length === 1, `Expected exactly one ACTIVE Global AI, found ${activeGlobals.length}.`);
  assertCheck(activeGlobals[0]?.projectId === null, "ACTIVE Global AI must have null projectId.");
  assertCheck(Array.isArray(activeGlobals[0]?.toolAllowlist) && (activeGlobals[0]?.toolAllowlist as unknown[]).every((tool) => String(tool) === "get_workspace_overview"), "Global AI has a tool outside the aggregate allowlist.");

  const result = {
    ok: true,
    readOnly: true,
    qaOnly: true,
    counts: { users: users.length, projects: projects.length, activeProjects: activeProjects.length, memberships: memberships.length, customers: customers.length, tasks: tasks.length, childAgents: agents.filter((agent) => agent.kind === "CHILD").length, activeChildAgents: activeChildren.length, globalAgents: globalAgents.length, activeGlobalAgents: activeGlobals.length },
    assertions: [
      "QA users active + mustChangePassword",
      "Company A/B ACTIVE; DRAFT and ARCHIVED sentinels present",
      "Sales/Finance/Viewer presets and revoked membership present",
      "Customer/task project ownership remains inside QA project set",
      "Exactly one ACTIVE child agent per active A/B company",
      "Exactly one ACTIVE Global AI with aggregate-only allowlist",
    ],
  };
  console.log(JSON.stringify(result, null, 2));
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
