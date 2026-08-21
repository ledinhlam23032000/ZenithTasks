import { describe, expect, it, vi } from "vitest";
import { syncCollaboratorIdentity } from "@/lib/collaborator-sync";

describe("syncCollaboratorIdentity", () => {
  it("updates existing display snapshots, links legacy records, and preserves money", async () => {
    const tx = {
      customer: { updateMany: vi.fn().mockResolvedValueOnce({ count: 2 }).mockResolvedValueOnce({ count: 1 }) },
      lead: { updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }) },
      appointment: { updateMany: vi.fn().mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 1 }) },
      caseRecord: { updateMany: vi.fn().mockResolvedValue({ count: 3 }) },
      commissionPayout: { updateMany: vi.fn().mockResolvedValue({ count: 4 }) },
      paymentRequest: { updateMany: vi.fn().mockResolvedValue({ count: 5 }) },
    };

    const result = await syncCollaboratorIdentity(tx as never, {
      collaboratorId: "ctv-1",
      legacyName: "CTV Cũ",
      displayName: "CTV Mới",
    });

    expect(result).toEqual({ customers: 3, leads: 2, appointments: 2, cases: 3, payouts: 4, paymentRequests: 5 });
    expect(tx.customer.updateMany).toHaveBeenNthCalledWith(1, {
      where: { collaboratorId: "ctv-1" },
      data: { sourceDetail: "CTV Mới" },
    });
    expect(tx.customer.updateMany).toHaveBeenNthCalledWith(2, {
      where: { collaboratorId: null, source: "COLLABORATOR", sourceDetail: "CTV Cũ" },
      data: { collaboratorId: "ctv-1", sourceDetail: "CTV Mới", collaboratorAssignedAt: expect.any(Date) },
    });
    expect(tx.caseRecord.updateMany).toHaveBeenCalledWith({
      where: { collaboratorId: null, customer: { source: "COLLABORATOR", sourceDetail: "CTV Cũ" } },
      data: { collaboratorId: "ctv-1", collaboratorAssignedAt: expect.any(Date) },
    });
    expect(tx.commissionPayout.updateMany).toHaveBeenCalledWith({
      where: { OR: [{ collaboratorId: "ctv-1" }, { collaboratorId: null, name: "CTV Cũ" }] },
      data: { collaboratorId: "ctv-1", name: "CTV Mới" },
    });
    expect(tx.paymentRequest.updateMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { payeeCollaboratorId: "ctv-1" },
          { payeeCollaboratorId: null, payeeName: "CTV Cũ", type: "COLLABORATOR" },
        ],
      },
      data: { payeeCollaboratorId: "ctv-1", payeeName: "CTV Mới" },
    });

    const payoutData = tx.commissionPayout.updateMany.mock.calls[0][0].data;
    const requestData = tx.paymentRequest.updateMany.mock.calls[0][0].data;
    expect(payoutData).not.toHaveProperty("amount");
    expect(requestData).not.toHaveProperty("amount");
  });
});
