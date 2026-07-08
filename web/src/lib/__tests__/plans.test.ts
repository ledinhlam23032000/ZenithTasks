import { describe, it, expect } from "vitest";
import { planProgress, sortByOrder, toggleTaskStatus, PLAN_ROLES } from "../plans";

describe("PLAN_ROLES", () => {
  it("chỉ 3 vai trò: ADMIN, MANAGER, SHAREHOLDER", () => {
    expect(PLAN_ROLES).toEqual(["ADMIN", "MANAGER", "SHAREHOLDER"]);
  });
});

describe("planProgress", () => {
  it("mảng rỗng → NOT_STARTED, 0%", () => {
    const p = planProgress([]);
    expect(p).toEqual({ total: 0, done: 0, percent: 0, status: "NOT_STARTED" });
  });

  it("toàn TODO → NOT_STARTED, 0%", () => {
    const p = planProgress([{ status: "TODO" }, { status: "TODO" }]);
    expect(p.status).toBe("NOT_STARTED");
    expect(p.percent).toBe(0);
  });

  it("toàn DONE → DONE, 100%", () => {
    const p = planProgress([{ status: "DONE" }, { status: "DONE" }]);
    expect(p.status).toBe("DONE");
    expect(p.percent).toBe(100);
  });

  it("trộn → IN_PROGRESS, % làm tròn", () => {
    const p = planProgress([{ status: "DONE" }, { status: "TODO" }, { status: "IN_PROGRESS" }]);
    expect(p.total).toBe(3);
    expect(p.done).toBe(1);
    expect(p.status).toBe("IN_PROGRESS");
    expect(p.percent).toBe(33);
  });
});

describe("sortByOrder", () => {
  it("sắp xếp theo order, không đổi mảng gốc", () => {
    const items = [{ order: 2, id: "b" }, { order: 0, id: "a" }, { order: 1, id: "c" }];
    const sorted = sortByOrder(items);
    expect(sorted.map((i) => i.id)).toEqual(["a", "c", "b"]);
    expect(items.map((i) => i.id)).toEqual(["b", "a", "c"]); // mảng gốc không đổi
  });
});

describe("toggleTaskStatus", () => {
  it("DONE → TODO", () => {
    expect(toggleTaskStatus("DONE")).toBe("TODO");
  });
  it("TODO → DONE", () => {
    expect(toggleTaskStatus("TODO")).toBe("DONE");
  });
  it("IN_PROGRESS → DONE", () => {
    expect(toggleTaskStatus("IN_PROGRESS")).toBe("DONE");
  });
});
