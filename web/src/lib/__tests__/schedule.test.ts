import { describe, it, expect } from "vitest";
import { slotConflict, findConflicts, minutesApart, SLOT_WINDOW_MIN, type ApptSlot } from "../schedule";

const base = new Date("2026-06-27T09:00:00Z").getTime();
const min = (n: number) => base + n * 60_000;

describe("slotConflict", () => {
  it("trùng khi cách nhau dưới cửa sổ (mặc định 30')", () => {
    expect(slotConflict(base, min(29))).toBe(true);
    expect(slotConflict(base, min(-15))).toBe(true);
  });
  it("không trùng khi cách bằng/hơn cửa sổ", () => {
    expect(slotConflict(base, min(30))).toBe(false);
    expect(slotConflict(base, min(45))).toBe(false);
  });
  it("dùng được cửa sổ tuỳ chỉnh", () => {
    expect(slotConflict(base, min(45), 60)).toBe(true);
  });
});

describe("findConflicts", () => {
  const others: ApptSlot[] = [
    { id: "a", scheduledAt: new Date(min(10)) }, // trùng (cách 10')
    { id: "b", scheduledAt: new Date(min(20)) }, // trùng (cách 20')
    { id: "c", scheduledAt: new Date(min(90)) }, // không trùng
  ];
  it("trả các lịch trùng, gần nhất trước", () => {
    const out = findConflicts(base, others);
    expect(out.map((o) => o.id)).toEqual(["a", "b"]);
  });
  it("bỏ qua chính lịch đang sửa (excludeId)", () => {
    const out = findConflicts(base, others, SLOT_WINDOW_MIN, "a");
    expect(out.map((o) => o.id)).toEqual(["b"]);
  });
  it("không có gì trùng → mảng rỗng", () => {
    expect(findConflicts(min(1000), others)).toHaveLength(0);
  });
});

describe("minutesApart", () => {
  it("số phút lệch, không âm", () => {
    expect(minutesApart(base, min(15))).toBe(15);
    expect(minutesApart(min(15), base)).toBe(15);
  });
});
