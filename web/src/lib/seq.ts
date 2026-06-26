// Tiện ích sinh số thứ tự cho mã (KH/HS/NV…) — THUẦN, không phụ thuộc DB (dễ test).

/**
 * Số thứ tự kế tiếp = (số lớn nhất hiện có theo tiền tố) + 1.
 * Dùng MAX thay vì count() để KHÔNG bị trùng mã sau khi đã xóa bản ghi.
 * VD: có HS00001, HS00003 (đã xóa HS00002) → count()+1 = HS00003 (TRÙNG!),
 *     còn nextSeq = 4 → HS00004 (đúng).
 */
export function nextSeq(codes: Array<string | null | undefined>, prefix: string): number {
  const re = new RegExp(`^${prefix}(\\d+)$`);
  let max = 0;
  for (const c of codes) {
    const m = c?.match(re);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return max + 1;
}

/** Lỗi trùng ràng buộc duy nhất (Prisma P2002) — dùng để thử sinh lại mã. */
export function isUniqueViolation(e: unknown): boolean {
  return !!e && typeof e === "object" && (e as { code?: string }).code === "P2002";
}
