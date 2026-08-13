import { describe, expect, it } from "vitest";
import { assertNonNegativeStock, stockAfter } from "../inventory";

describe("inventory policy", () => {
  it("tính tồn sau biến động và chặn âm kho", () => {
    expect(stockAfter(10, -3)).toBe(7);
    expect(() => assertNonNegativeStock(2, -3)).toThrow("Không đủ tồn kho");
    expect(() => assertNonNegativeStock(2, -2)).not.toThrow();
  });
});
