import { Prisma } from "@/generated/prisma/client";

export class InventoryError extends Error {
  constructor(message = "Không đủ tồn kho.") {
    super(message);
    this.name = "InventoryError";
  }
}

export function stockAfter(current: number, delta: number): number {
  return Math.round((current + delta) * 100) / 100;
}

export function assertNonNegativeStock(current: number, delta: number): void {
  if (stockAfter(current, delta) < 0) throw new InventoryError();
}

type BomInput = {
  materialId: string;
  quantity: number;
  actorId: string;
  sourceType: string;
  sourceId: string;
  note?: string;
};

type ReverseInput = BomInput & { reversalOfId?: string | null };

function decimalQuantity(quantity: number): Prisma.Decimal {
  if (!Number.isFinite(quantity) || quantity <= 0) throw new InventoryError("Số lượng vật tư không hợp lệ.");
  return new Prisma.Decimal(quantity);
}

/** Kiểm tra nhanh trước khi thao tác; consumeBomTx vẫn dùng điều kiện stock >= q để chống race. */
export async function assertStockAvailableTx(tx: Prisma.TransactionClient, materialId: string, quantity: number): Promise<void> {
  const q = decimalQuantity(quantity);
  const material = await tx.material.findUnique({ where: { id: materialId }, select: { stock: true, name: true } });
  if (!material) throw new InventoryError("Không tìm thấy vật tư.");
  if (material.stock.lt(q)) throw new InventoryError(`Không đủ tồn kho vật tư “${material.name}”.`);
}

/** Xuất kho nguyên tử và ghi nguồn giao dịch. Mặc định không cho âm kho. */
export async function consumeBomTx(tx: Prisma.TransactionClient, input: BomInput) {
  const q = decimalQuantity(input.quantity);
  const material = await tx.material.findUnique({ where: { id: input.materialId }, select: { name: true, unit: true } });
  if (!material) throw new InventoryError("Không tìm thấy vật tư.");

  const updated = await tx.material.updateMany({
    where: { id: input.materialId, stock: { gte: q } },
    data: { stock: { decrement: q } },
  });
  if (updated.count !== 1) throw new InventoryError(`Không đủ tồn kho vật tư “${material.name}”.`);

  return tx.stockMovement.create({
    data: {
      materialId: input.materialId,
      type: "OUT",
      quantity: q,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      note: input.note ?? null,
      createdById: input.actorId,
    },
  });
}

/** Hoàn kho có liên kết giao dịch gốc khi có thể. */
export async function reverseBomTx(tx: Prisma.TransactionClient, input: ReverseInput) {
  const q = decimalQuantity(input.quantity);
  const material = await tx.material.findUnique({ where: { id: input.materialId }, select: { id: true } });
  if (!material) throw new InventoryError("Không tìm thấy vật tư.");
  await tx.material.update({ where: { id: input.materialId }, data: { stock: { increment: q } } });
  return tx.stockMovement.create({
    data: {
      materialId: input.materialId,
      type: "IN",
      quantity: q,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      reversalOfId: input.reversalOfId ?? null,
      note: input.note ?? "Hoàn kho",
      createdById: input.actorId,
    },
  });
}

/** Điều chỉnh BOM khi tăng/giảm số lượng hoặc đổi vật tư. */
export async function adjustBomQuantityTx(
  tx: Prisma.TransactionClient,
  input: {
    oldMaterialId?: string | null;
    oldQuantity: number;
    newMaterialId?: string | null;
    newQuantity: number;
    actorId: string;
    sourceType: string;
    sourceId: string;
    originalMovementId?: string | null;
  },
) {
  if (input.oldMaterialId && input.oldMaterialId === input.newMaterialId) {
    const delta = input.newQuantity - input.oldQuantity;
    if (delta > 0) {
      return consumeBomTx(tx, { materialId: input.oldMaterialId, quantity: delta, actorId: input.actorId, sourceType: input.sourceType, sourceId: input.sourceId, note: "Xuất bổ sung do điều chỉnh" });
    }
    if (delta < 0) {
      return reverseBomTx(tx, { materialId: input.oldMaterialId, quantity: Math.abs(delta), actorId: input.actorId, sourceType: input.sourceType, sourceId: input.sourceId, reversalOfId: input.originalMovementId, note: "Hoàn phần giảm do điều chỉnh" });
    }
    return null;
  }

  if (input.oldMaterialId && input.oldQuantity > 0) {
    await reverseBomTx(tx, { materialId: input.oldMaterialId, quantity: input.oldQuantity, actorId: input.actorId, sourceType: input.sourceType, sourceId: input.sourceId, reversalOfId: input.originalMovementId, note: "Hoàn vật tư cũ do đổi vật tư" });
  }
  if (input.newMaterialId && input.newQuantity > 0) {
    return consumeBomTx(tx, { materialId: input.newMaterialId, quantity: input.newQuantity, actorId: input.actorId, sourceType: input.sourceType, sourceId: input.sourceId, note: "Xuất vật tư mới do đổi vật tư" });
  }
  return null;
}

/** Xuất toàn bộ định mức vật tư của một dịch vụ đã thêm vào hồ sơ. */
export async function consumeServiceBomTx(
  tx: Prisma.TransactionClient,
  input: { serviceId: string; caseServiceId: string; actorId: string },
) {
  const bom = await tx.serviceMaterial.findMany({ where: { serviceId: input.serviceId }, select: { materialId: true, quantity: true, material: { select: { name: true, unit: true } } } });
  const caseService = await tx.caseService.findUnique({ where: { id: input.caseServiceId }, select: { caseId: true } });
  if (!caseService) throw new InventoryError("Không tìm thấy dịch vụ trong hồ sơ.");
  const usages = [];
  for (const item of bom) {
    const quantity = item.quantity.toNumber();
    const usage = await tx.materialUsage.create({
      data: {
        caseId: caseService.caseId,
        caseServiceId: input.caseServiceId,
        materialId: item.materialId,
        name: item.material.name,
        unit: item.material.unit,
        quantity,
        sourceType: "CASE_SERVICE",
        performedById: input.actorId,
      },
    });
    await consumeBomTx(tx, { materialId: item.materialId, quantity, actorId: input.actorId, sourceType: "CASE_SERVICE", sourceId: input.caseServiceId, note: "Xuất theo định mức dịch vụ" });
    usages.push(usage);
  }
  return usages;
}
