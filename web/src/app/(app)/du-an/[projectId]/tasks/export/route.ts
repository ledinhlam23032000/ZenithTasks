import { csvResponse } from "@/lib/export";
import { prisma } from "@/lib/db";
import { requireProjectModule } from "@/lib/v2-access";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { project } = await requireProjectModule(projectId, "tasks", { activeOnly: true });
  const tasks = await prisma.zWorkspaceTask.findMany({
    where: { projectId: project.id },
    orderBy: [{ status: "asc" }, { order: "asc" }, { createdAt: "desc" }],
    select: {
      title: true,
      description: true,
      priority: true,
      status: true,
      dueAt: true,
      createdAt: true,
      assignee: { select: { fullName: true, username: true } },
    },
  });

  return csvResponse(`workspace-${project.code.toLowerCase()}-tasks`, [
    ["Project ID", "Project code", "Title", "Description", "Priority", "Status", "Due at", "Assignee", "Assignee username", "Created at"],
    ...tasks.map((task) => [
      project.id,
      project.code,
      task.title,
      task.description ?? "",
      task.priority,
      task.status,
      task.dueAt?.toISOString() ?? "",
      task.assignee?.fullName ?? "",
      task.assignee?.username ?? "",
      task.createdAt.toISOString(),
    ]),
  ]);
}
