import { redirect } from "next/navigation";
import { prisma } from "./db";
import { requireUser } from "./auth";
import { projectMemberCan, projectModuleCanView, type ProjectCapability } from "./v2-project-capabilities";

export async function requireV2User() {
  const user = await requireUser();
  if (process.env.ENABLE_ZENITH_V2 !== "true") redirect("/khong-co-quyen");
  return user;
}

export async function requireProjectAccess(projectId: string, options: { activeOnly?: boolean } = {}) {
  const user = await requireV2User();
  const statusFilter = options.activeOnly ? { status: "ACTIVE" as const } : { status: { not: "ARCHIVED" as const } };
  const project = await prisma.zProject.findFirst({
    where: user.role === "ADMIN"
      ? { id: projectId, ...statusFilter }
      : { id: projectId, ...statusFilter, members: { some: { userId: user.id, active: true } } },
    include: {
      _count: { select: { members: true, units: true, positions: true, mechanisms: true, workspaceTasks: true, workspaceCustomers: true, workspaceAppointments: true, workspaceSales: true } },
    },
  });
  if (!project) redirect("/khong-co-quyen");
  const membership = user.role === "ADMIN" ? null : await prisma.zProjectMember.findFirst({ where: { projectId: project.id, userId: user.id, active: true }, select: { id: true, preset: true, permissions: true } });
  if (user.role !== "ADMIN" && !membership) redirect("/khong-co-quyen");
  return { user, project, membership };
}

export async function requireProjectCapability(projectId: string, capability: ProjectCapability, options: { activeOnly?: boolean } = {}) {
  const access = await requireProjectAccess(projectId, options);
  if (access.user.role !== "ADMIN" && (!access.membership || !projectMemberCan(access.membership, capability))) redirect("/khong-co-quyen");
  return access;
}

export async function requireProjectModule(projectId: string, moduleKey: string, options: { activeOnly?: boolean } = {}) {
  const access = await requireProjectAccess(projectId, options);
  if (access.user.role !== "ADMIN" && !projectModuleCanView(access.membership, moduleKey)) redirect("/khong-co-quyen");
  return access;
}

export function isWorkspaceAdmin(role: string) {
  return role === "ADMIN";
}
