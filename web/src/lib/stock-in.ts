// ============================================================================
// PHIẾU NHẬP KHO NHIỀU DÒNG (B5) — toán THUẦN, không phụ thuộc DB (có test).
//
// Lọc các dòng nhập hợp lệ từ form nhiều dòng: phải có vật tư + số lượng > 0.
// Đơn giá (giá vốn nhập) không âm; để 0 nghĩa là "không khai báo giá" (giữ giá vốn cũ
// khi nhập — xem lib/inventory-cost.ts). Việc cộng tồn + cập nhật giá vốn bình quân +
// ghi StockMovement do server action `stockInBatch` lo (nguyên tử trong 1 giao dịch).
// ============================================================================

export type StockInLine = { materialId: string; quantity: number; unitCost: number };

/** Giữ lại các dòng hợp lệ (có vật tư + SL > 0); chuẩn hoá đơn giá ≥ 0. */
export function validStockInLines(lines: StockInLine[]): StockInLine[] {
  return lines
    .filter((l) => l.materialId.trim() !== "" && l.quantity > 0)
    .map((l) => ({
      materialId: l.materialId.trim(),
      quantity: l.quantity,
      unitCost: Math.max(0, Number.isFinite(l.unitCost) ? l.unitCost : 0),
    }));
}

/** Gộp 3 mảng song song (từ FormData.getAll) thành danh sách dòng hợp lệ. */
export function parseStockInLines(ids: string[], quantities: number[], unitCosts: number[]): StockInLine[] {
  const lines: StockInLine[] = ids.map((id, i) => ({
    materialId: String(id ?? ""),
    quantity: Number(quantities[i] ?? 0) || 0,
    unitCost: Number(unitCosts[i] ?? 0) || 0,
  }));
  return validStockInLines(lines);
}

/** Tổng giá trị nhập của phiếu (Σ SL × đơn giá) — để hiển thị/đối chiếu. */
export function stockInTotal(lines: StockInLine[]): number {
  return lines.reduce((s, l) => s + l.quantity * l.unitCost, 0);
}
