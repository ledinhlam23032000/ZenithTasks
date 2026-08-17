// ============================================================================
// ĐỊNH MỨC VẬT TƯ THEO DỊCH VỤ (BOM — B5 giai đoạn 2) — toán THUẦN, không phụ
// thuộc DB (có test ở __tests__).
//
// "Định mức" (BOM line) = 1 dịch vụ tiêu hao mặc định `bomQty` đơn vị 1 vật tư cho
// MỖI lần làm. Khi thêm dịch vụ vào hồ sơ với số lượng `serviceQty`, lượng vật tư
// thực cần = bomQty × serviceQty. Các hàm dưới chỉ tính số — việc trừ kho thật do
// server action `applyServiceBom` lo (ghi MaterialUsage + StockMovement nguyên tử).
// ============================================================================

export type BomLine = {
  materialId: string;
  name: string;
  unit: string;
  bomQty: number; // định mức / 1 lần dịch vụ
  stock: number; // tồn kho hiện tại
  avgCost: number; // giá vốn bình quân (VND/đơn vị)
};

export type BomNeed = {
  materialId: string;
  name: string;
  unit: string;
  need: number; // số lượng cần trừ = bomQty × serviceQty
  stock: number;
  avgCost: number;
  short: boolean; // true nếu need > stock (thiếu tồn)
};

/** Lượng vật tư cần trừ cho một dòng định mức khi làm `serviceQty` lần dịch vụ. */
export function scaleBomQty(bomQty: number, serviceQty: number): number {
  const q = Math.max(0, bomQty) * Math.max(0, Math.floor(serviceQty || 0));
  return round2(q);
}

/**
 * Quy đổi danh sách định mức của một dịch vụ ra nhu cầu thực tế theo số lượng dịch
 * vụ. Bỏ qua các dòng có định mức ≤ 0. Đánh dấu `short` khi tồn không đủ.
 */
export function bomNeeds(lines: BomLine[], serviceQty: number): BomNeed[] {
  return lines
    .map((l) => {
      const need = scaleBomQty(l.bomQty, serviceQty);
      return {
        materialId: l.materialId,
        name: l.name,
        unit: l.unit,
        need,
        stock: l.stock,
        avgCost: l.avgCost,
        short: need > Math.max(0, l.stock),
      };
    })
    .filter((n) => n.need > 0);
}

/** Các dòng thiếu tồn (need > stock) — để cảnh báo trước khi trừ. */
export function bomShortages(needs: BomNeed[]): BomNeed[] {
  return needs.filter((n) => n.short);
}

/** Giá vốn ước tính khi áp định mức = Σ need × giá vốn bình quân. */
export function bomCost(needs: Array<{ need: number; avgCost: number }>): number {
  return round2(needs.reduce((s, n) => s + Math.max(0, n.need) * Math.max(0, n.avgCost), 0));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
