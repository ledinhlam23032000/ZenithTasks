import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const COLLABORATOR_VISIBILITY_MONTHS = 6;

export type CollaboratorIdentity = {
  id: string;
  userId: string | null;
  name: string;
  active: boolean;
};

export function collaboratorCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - COLLABORATOR_VISIBILITY_MONTHS);
  return cutoff;
}

export function collaboratorOwnsCustomer(
  customer: { collaboratorId: string | null; collaboratorAssignedAt: Date | null },
  collaboratorId: string,
  now = new Date(),
): boolean {
  return customer.collaboratorId === collaboratorId && !!customer.collaboratorAssignedAt && customer.collaboratorAssignedAt >= collaboratorCutoff(now);
}

export function collaboratorCustomerWhere(collaboratorId: string, now = new Date()): Prisma.CustomerWhereInput {
  return {
    collaboratorId,
    collaboratorAssignedAt: { gte: collaboratorCutoff(now) },
  };
}

export function collaboratorCaseWhere(collaboratorId: string, now = new Date()): Prisma.CaseRecordWhereInput {
  return {
    collaboratorId,
    collaboratorAssignedAt: { gte: collaboratorCutoff(now) },
  };
}

export async function getCollaboratorForUser(userId: string): Promise<CollaboratorIdentity | null> {
  return prisma.collaborator.findUnique({
    where: { userId },
    select: { id: true, userId: true, name: true, active: true },
  });
}

export async function requireCollaborator(userId: string): Promise<CollaboratorIdentity> {
  const collaborator = await getCollaboratorForUser(userId);
  if (!collaborator || !collaborator.active) redirect("/khong-co-quyen");
  return collaborator;
}
