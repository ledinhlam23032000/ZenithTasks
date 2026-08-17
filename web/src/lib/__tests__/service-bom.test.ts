import { describe, it, expect } from "vitest";
import { scaleBomQty, bomNeeds, bomShortages, bomCost, type BomLine } from "../service-bom";

describe("scaleBomQty", () => {
  it("nhân định mức với số lượng dịch vụ", () => {
    expect(scaleBomQty(2, 3)).toBe(6);
    expect(scaleBomQty(0.5, 4)).toBe(2);
  });
  it("số lượng dịch vụ lẻ → lấy phần nguyên (CaseService.quantity là số nguyên)", () => {
    expect(scaleBomQty(2, 2.9)).toBe(4);
  });
  it("không âm với đầu vào âm/0", () => {
    expect(scaleBomQty(-2, 3)).toBe(0);
    expect(scaleBomQty(2, 0)).toBe(0);
  });
});

const lines: BomLine[] = [
  { materialId: "m1", name: "Filler", unit: "ml", bomQty: 2, stock: 10, avgCost: 1_000_000 },
  { materialId: "m2", name: "Kim", unit: "cái", bomQty: 1, stock: 1, avgCost: 5_000 },
  { materialId: "m3", name: "Gạc", unit: "gói", bomQty: 0, stock: 100, avgCost: 2_000 }, // định mức 0 → bỏ
];

describe("bomNeeds", () => {
  it("quy đổi nhu cầu theo số lượng dịch vụ và bỏ dòng định mức 0", () => {
    const needs = bomNeeds(lines, 2);
    expect(needs.map((n) => n.materialId)).toEqual(["m1", "m2"]);
    expect(needs[0].need).toBe(4); // 2 × 2
    expect(needs[1].need).toBe(2); // 1 × 2
  });
  it("đánh dấu short khi tồn không đủ", () => {
    const needs = bomNeeds(lines, 2);
    expect(needs.find((n) => n.materialId === "m1")?.short).toBe(false); // cần 4, tồn 10
    expect(needs.find((n) => n.materialId === "m2")?.short).toBe(true); // cần 2, tồn 1
  });
});

describe("bomShortages", () => {
  it("chỉ trả các dòng thiếu tồn", () => {
    const short = bomShortages(bomNeeds(lines, 2));
    expect(short.map((n) => n.materialId)).toEqual(["m2"]);
  });
  it("đủ tồn → không có cảnh báo", () => {
    const short = bomShortages(bomNeeds(lines, 1));
    expect(short).toHaveLength(0); // cần 2 filler/tồn 10, 1 kim/tồn 1
  });
});

describe("bomCost", () => {
  it("tổng giá vốn ước tính = Σ need × giá vốn", () => {
    const needs = bomNeeds(lines, 2);
    // m1: 4 × 1.000.000 = 4.000.000 ; m2: 2 × 5.000 = 10.000
    expect(bomCost(needs)).toBe(4_010_000);
  });
});
