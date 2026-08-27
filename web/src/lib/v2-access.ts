import { redirect } from "next/navigation";
import { prisma } from "./db";
import { requireUser } from "./auth";

export async function requireV2User() {
  const user = await requireUser(["ADMIN", "MANAGER"]);
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
  return { user, project };
}

export function isWorkspaceAdmin(role: string) {
  return role === "ADMIN";
}
