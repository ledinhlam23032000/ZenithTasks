// ============================================================================
// GIÁ VỐN TỒN KHO (B5) — toán THUẦN, không phụ thuộc DB (có test ở __tests__).
//
// Dùng phương pháp BÌNH QUÂN GIA QUYỀN (weighted average cost):
//   - Mỗi lần NHẬP kho số lượng q với đơn giá c → giá vốn bình quân mới =
//     (tồn cũ × giá vốn cũ + q × c) / (tồn cũ + q).
//   - Nếu lần nhập KHÔNG khai báo đơn giá (c ≤ 0) → giữ nguyên giá vốn cũ
//     (chỉ cộng số lượng), tránh "pha loãng" giá vốn về 0.
//   - Nếu TRƯỚC ĐÓ chưa từng ghi giá vốn (giá vốn cũ = 0) → LẤY LUÔN đơn giá lần
//     nhập này làm giá vốn (không pha loãng với tồn cũ "giá 0" — vốn là chưa biết giá,
//     không phải giá bằng 0). Hợp thực tế khi bắt đầu theo dõi giá vốn.
//   - XUẤT kho không làm đổi giá vốn bình quân (chỉ giảm số lượng).
// Làm tròn tới đồng (số nguyên) cho gọn — vật tư y tế đơn giá là VND nguyên.
// ============================================================================

/** Giá vốn bình quân mới sau khi nhập `inQty` đơn vị với đơn giá `inUnitCost`. */
export function weightedAvgCost(input: {
  oldStock: number;
  oldAvg: number;
  inQty: number;
  inUnitCost: number;
}): number {
  const oldStock = Math.max(0, input.oldStock);
  const oldAvg = Math.max(0, input.oldAvg);
  const inQty = Math.max(0, input.inQty);
  const inUnitCost = input.inUnitCost;

  // Không khai báo giá nhập → không đổi giá vốn.
  if (!(inUnitCost > 0)) return round2(oldAvg);

  // Chưa từng có giá vốn → lấy luôn đơn giá lần nhập này (không pha loãng với tồn "giá 0").
  if (!(oldAvg > 0)) return round2(inUnitCost);

  const newStock = oldStock + inQty;
  if (newStock <= 0) return round2(inUnitCost);

  const newAvg = (oldStock * oldAvg + inQty * inUnitCost) / newStock;
  return round2(newAvg);
}

/** Giá trị tồn của một mặt hàng = tồn × giá vốn bình quân (≥ 0). */
export function stockValue(stock: number, avgCost: number): number {
  return round2(Math.max(0, stock) * Math.max(0, avgCost));
}

/** Tổng giá trị tồn kho từ danh sách mặt hàng. */
export function totalStockValue(items: Array<{ stock: number; avgCost: number }>): number {
  return round2(items.reduce((sum, it) => sum + stockValue(it.stock, it.avgCost), 0));
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
