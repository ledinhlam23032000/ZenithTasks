import type { Prisma } from "@/generated/prisma/client";

export type CollaboratorSyncDb = Prisma.TransactionClient;

export type CollaboratorSyncCounts = {
  customers: number;
  leads: number;
  appointments: number;
  cases: number;
  payouts: number;
  paymentRequests: number;
};

export async function syncCollaboratorIdentity(
  tx: CollaboratorSyncDb,
  input: { collaboratorId: string; legacyName: string; displayName: string },
): Promise<CollaboratorSyncCounts> {
  const legacyName = input.legacyName.trim();
  const sourceWhere = { source: "COLLABORATOR" as const, sourceDetail: legacyName };
  const customerLegacyWhere = { collaboratorId: null, ...sourceWhere };
  const leadLegacyWhere = { collaboratorId: null, ...sourceWhere };
  const appointmentLegacyWhere = { collaboratorId: null, ...sourceWhere };
  const assignedAt = new Date();

  const [customerLinked, customerLegacy, leadLinked, leadLegacy, appointmentLinked, appointmentLegacy, cases, payouts, paymentRequests] = await Promise.all([
    tx.customer.updateMany({
      where: { collaboratorId: input.collaboratorId },
      data: { sourceDetail: input.displayName },
    }),
    tx.customer.updateMany({
      where: customerLegacyWhere,
      data: { collaboratorId: input.collaboratorId, sourceDetail: input.displayName, collaboratorAssignedAt: assignedAt },
    }),
    tx.lead.updateMany({
      where: { collaboratorId: input.collaboratorId },
      data: { sourceDetail: input.displayName },
    }),
    tx.lead.updateMany({
      where: leadLegacyWhere,
      data: { collaboratorId: input.collaboratorId, sourceDetail: input.displayName },
    }),
    tx.appointment.updateMany({
      where: { collaboratorId: input.collaboratorId },
      data: { sourceDetail: input.displayName },
    }),
    tx.appointment.updateMany({
      where: appointmentLegacyWhere,
      data: { collaboratorId: input.collaboratorId, sourceDetail: input.displayName },
    }),
    tx.caseRecord.updateMany({
      where: { collaboratorId: null, customer: sourceWhere },
      data: { collaboratorId: input.collaboratorId, collaboratorAssignedAt: assignedAt },
    }),
    tx.commissionPayout.updateMany({
      where: { OR: [{ collaboratorId: input.collaboratorId }, { collaboratorId: null, name: legacyName }] },
      data: { collaboratorId: input.collaboratorId, name: input.displayName },
    }),
    tx.paymentRequest.updateMany({
      where: {
        OR: [
          { payeeCollaboratorId: input.collaboratorId },
          { payeeCollaboratorId: null, payeeName: legacyName, type: "COLLABORATOR" },
        ],
      },
      data: { payeeCollaboratorId: input.collaboratorId, payeeName: input.displayName },
    }),
  ]);

  return {
    customers: customerLinked.count + customerLegacy.count,
    leads: leadLinked.count + leadLegacy.count,
    appointments: appointmentLinked.count + appointmentLegacy.count,
    cases: cases.count,
    payouts: payouts.count,
    paymentRequests: paymentRequests.count,
  };
}
