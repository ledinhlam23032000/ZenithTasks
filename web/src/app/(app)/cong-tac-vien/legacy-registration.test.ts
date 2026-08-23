import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    user: { create: vi.fn().mockResolvedValue({ id: "user-1" }) },
    collaborator: { create: vi.fn().mockResolvedValue({ id: "collaborator-1" }) },
  };
  return {
    tx,
    prisma: {
      collaborator: { findUnique: vi.fn().mockResolvedValue(null) },
      user: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (callback: (db: typeof tx) => Promise<unknown>) => callback(tx)),
    },
    requireUser: vi.fn().mockResolvedValue({ id: "admin-1", role: "ADMIN" }),
    hashPassword: vi.fn().mockResolvedValue("hash"),
    auditRequired: vi.fn().mockResolvedValue(undefined),
    syncCollaboratorIdentity: vi.fn().mockResolvedValue({ customers: 1, leads: 0, appointments: 1, cases: 2, payouts: 1, paymentRequests: 1 }),
    revalidatePath: vi.fn(),
    redirect: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ prisma: mocks.prisma }));
vi.mock("@/lib/auth", () => ({ requireUser: mocks.requireUser, hashPassword: mocks.hashPassword }));
vi.mock("@/lib/audit", () => ({ auditRequired: mocks.auditRequired }));
vi.mock("@/lib/collaborator-sync", () => ({ syncCollaboratorIdentity: mocks.syncCollaboratorIdentity }));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import { createCollaborator } from "./actions";

describe("createCollaborator legacy registration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.collaborator.findUnique.mockResolvedValue(null);
    mocks.prisma.user.findFirst.mockResolvedValue(null);
    mocks.tx.user.create.mockResolvedValue({ id: "user-1" });
    mocks.tx.collaborator.create.mockResolvedValue({ id: "collaborator-1" });
    mocks.syncCollaboratorIdentity.mockResolvedValue({ customers: 1, leads: 0, appointments: 1, cases: 2, payouts: 1, paymentRequests: 1 });
  });

  it("keeps the old display name as a separate key while creating the official profile", async () => {
    const formData = new FormData();
    formData.set("name", "Chị Sen Chính Thức");
    formData.set("legacyName", "Chị Sen");
    formData.set("username", "chi.sen");
    formData.set("password", "matkhau-dai-hon-12");

    const result = await createCollaborator({}, formData);

    expect(result).toEqual({ ok: true });
    expect(mocks.syncCollaboratorIdentity).toHaveBeenCalledWith(mocks.tx, {
      collaboratorId: "collaborator-1",
      legacyName: "Chị Sen",
      displayName: "Chị Sen Chính Thức",
    });
    expect(mocks.tx.collaborator.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ name: "Chị Sen Chính Thức", userId: "user-1" }),
    });
    expect(mocks.auditRequired).toHaveBeenCalledWith(
      mocks.tx,
      "admin-1",
      "CREATE_COLLABORATOR_ACCOUNT",
      expect.objectContaining({ meta: expect.objectContaining({ linkedLegacy: true, moneyRecalculated: false }) }),
    );
  });
});
