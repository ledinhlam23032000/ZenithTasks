"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { toNum } from "@/lib/money";
import { weightedAvgCost } from "@/lib/inventory-cost";
import { parseStockInLines } from "@/lib/stock-in";

export type StockInState = { ok?: boolean; error?: string };

/**
 * Phiếu NHẬP KHO NHIỀU DÒNG (B5): mỗi dòng = 1 vật tư + SL + đơn giá nhập (tuỳ chọn).
 * Trong CÙNG một giao dịch: cộng tồn + cập nhật giá vốn bình quân + ghi StockMovement IN
 * cho từng dòng. Ghi chú/nhà cung cấp dùng chung cho cả phiếu.
 */
export async function stockInBatch(formData: FormData): Promise<StockInState> {
  const user = await requireUser(["ADMIN", "MANAGER"]);

  const ids = formData.getAll("materialId").map(String);
  const quantities = formData.getAll("quantity").map((v) => Number(v));
  const unitCosts = formData.getAll("unitCost").map((v) => Number(v));
  const note = String(formData.get("note") ?? "").trim();

  const lines = parseStockInLines(ids, quantities, unitCosts);
  if (lines.length === 0) return { error: "Vui lòng nhập ít nhất một dòng (chọn vật tư + số lượng > 0)." };

  await prisma.$transaction(async (tx) => {
    for (const l of lines) {
      const m = await tx.material.findUnique({ where: { id: l.materialId }, select: { stock: true, avgCost: true } });
      if (!m) continue; // vật tư đã bị xóa → bỏ qua dòng đó
      const newAvg = weightedAvgCost({
        oldStock: toNum(m.stock),
        oldAvg: toNum(m.avgCost),
        inQty: l.quantity,
        inUnitCost: l.unitCost,
      });
      await tx.material.update({ where: { id: l.materialId }, data: { stock: { increment: l.quantity }, avgCost: newAvg } });
      await tx.stockMovement.create({
        data: {
          materialId: l.materialId,
          type: "IN",
          quantity: l.quantity,
          unitCost: l.unitCost > 0 ? l.unitCost : null,
          note: note || "Phiếu nhập kho",
          createdById: user.id,
        },
      });
    }
  });

  revalidatePath("/kho");
  revalidatePath("/danh-muc");
  return { ok: true };
}
