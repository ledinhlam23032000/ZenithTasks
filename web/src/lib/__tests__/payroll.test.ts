import { describe, it, expect } from "vitest";
import { missingAttendanceStaff } from "../payroll-pure";

describe("missingAttendanceStaff", () => {
  it("trả mảng rỗng khi ai cũng có ngày công", () => {
    const rows = [{ id: "1", daysWorked: 20 }, { id: "2", daysWorked: 5 }];
    expect(missingAttendanceStaff(rows)).toEqual([]);
  });

  it("lọc đúng những người 0 ngày công", () => {
    const rows = [{ id: "1", daysWorked: 20 }, { id: "2", daysWorked: 0 }, { id: "3", daysWorked: 0 }];
    expect(missingAttendanceStaff(rows).map((r) => r.id)).toEqual(["2", "3"]);
  });

  it("trả mảng rỗng khi input rỗng", () => {
    expect(missingAttendanceStaff([])).toEqual([]);
  });

  it("không coi ngày công thấp nhưng khác 0 là thiếu", () => {
    const rows = [{ id: "1", daysWorked: 1 }];
    expect(missingAttendanceStaff(rows)).toEqual([]);
  });
});
