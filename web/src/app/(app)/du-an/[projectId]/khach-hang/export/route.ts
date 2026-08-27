import { csvResponse } from "@/lib/export";
import { prisma } from "@/lib/db";
import { requireProjectModule } from "@/lib/v2-access";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const { project } = await requireProjectModule(projectId, "customers", { activeOnly: true });
  const customers = await prisma.zWorkspaceCustomer.findMany({
    where: { projectId: project.id },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    select: {
      code: true,
      fullName: true,
      phoneLast4: true,
      source: true,
      consentStatus: true,
      active: true,
      createdAt: true,
    },
  });

  return csvResponse(`workspace-${project.code.toLowerCase()}-customers`, [
    ["Project ID", "Project code", "Customer code", "Full name", "Phone last 4", "Source", "Consent", "Active", "Created at"],
    ...customers.map((customer) => [
      project.id,
      project.code,
      customer.code,
      customer.fullName,
      customer.phoneLast4 ?? "",
      customer.source ?? "",
      customer.consentStatus ?? "",
      customer.active ? "ACTIVE" : "ARCHIVED",
      customer.createdAt.toISOString(),
    ]),
  ]);
}
