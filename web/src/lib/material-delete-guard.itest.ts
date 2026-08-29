/**
 * Bằng chứng runtime: deleteMaterial/deleteService không còn cascade xóa lịch
 * sử kho/hồ sơ, trên dữ liệu QA thật.
 *
 * Trước fix: `prisma.material.delete` CASCADE xóa toàn bộ StockMovement (mọi
 * phiếu nhập/xuất kèm unitCost) và ServiceMaterial (định mức BOM), nuốt lỗi
 * qua `.catch(() => {})`, không audit.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const rawUrl = process.env.QA_DATABASE_URL ?? "";
const enabled =
  process.env.QA_CONFIRM === "YES" &&
  rawUrl !== "" &&
  /(qa|test|staging)/i.test(rawUrl) &&
  !/(clinic|production|trungtam|hongphuc)/i.test(rawUrl);
if (enabled) process.env.DATABASE_URL = rawUrl;

vi.mock("next/cache", () => ({ revalidatePath: () => {} }));
let scenarioAdminId = "";
vi.mock("./auth", () => ({
  requireUser: async () => ({ id: scenarioAdminId, role: "ADMIN" }),
}));

describe.runIf(enabled)("deleteMaterial/deleteService không cascade mất lịch sử (QA thật)", () => {
  let materialId = "";

  beforeAll(async () => {
    const { prisma } = await import("./db");
    const admin = await prisma.user.upsert({
      where: { username: "__qa_material_delete_admin__" },
      update: {},
      create: { username: "__qa_material_delete_admin__", fullName: "QA Material Delete Admin", role: "ADMIN", passwordHash: "x", active: true },
    });
    scenarioAdminId = admin.id;
  });

  afterAll(async () => {
    if (materialId) {
      const { prisma } = await import("./db");
      await prisma.stockMovement.deleteMany({ where: { materialId } });
      await prisma.material.deleteMany({ where: { id: materialId } });
    }
  });

  it("vật tư ĐÃ có nhật ký kho: deleteMaterial từ chối, StockMovement vẫn nguyên", async () => {
    const { prisma } = await import("./db");
    const { deleteMaterial } = await import("../app/(app)/danh-muc/actions");

    const material = await prisma.material.create({
      data: { name: "QA Demo Vật tư có lịch sử", unit: "cái", stock: 10, avgCost: 100_000 },
    });
    materialId = material.id;
    await prisma.stockMovement.create({
      data: { materialId: material.id, type: "IN", quantity: 10, unitCost: 100_000 },
    });

    const form = new FormData();
    form.append("id", material.id);
    const res = await deleteMaterial(form);
    expect(res && "error" in res && res.error, "phải từ chối kèm lý do").toBeTruthy();

    const stillThere = await prisma.material.findUnique({ where: { id: material.id } });
    expect(stillThere, "vật tư không được xóa").toBeTruthy();
    const movementCount = await prisma.stockMovement.count({ where: { materialId: material.id } });
    expect(movementCount, "nhật ký kho phải còn nguyên").toBe(1);
  });

  it("vật tư CHƯA từng dùng: deleteMaterial xóa được thật và ghi audit", async () => {
    const { prisma } = await import("./db");
    const { deleteMaterial } = await import("../app/(app)/danh-muc/actions");

    const material = await prisma.material.create({
      data: { name: "QA Demo Vật tư chưa dùng", unit: "cái", stock: 0, avgCost: 0 },
    });

    const form = new FormData();
    form.append("id", material.id);
    const res = await deleteMaterial(form);
    expect(res).toBeUndefined();

    const gone = await prisma.material.findUnique({ where: { id: material.id } });
    expect(gone, "vật tư chưa dùng phải xóa được thật").toBeNull();

    const audit = await prisma.auditLog.findFirst({
      where: { action: "DELETE_MATERIAL", entityId: material.id },
    });
    expect(audit, "phải ghi audit DELETE_MATERIAL").toBeTruthy();
  });
});
