import { describe, it, expect } from "vitest";
import { buildXlsx } from "../xlsx";

describe("buildXlsx", () => {
  const buf = buildXlsx([
    {
      name: "Thu chi",
      columns: [{ header: "Ngày" }, { header: "Hạng mục" }, { header: "Số tiền" }],
      rows: [
        ["19/06/2026", "Mua vật tư <filler>", 1234567],
        ["Tổng", null, 1234567],
      ],
    },
  ]);

  it("trả về Buffer là file ZIP hợp lệ (PK header + EOCD)", () => {
    expect(Buffer.isBuffer(buf)).toBe(true);
    // Local file header signature
    expect(buf.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    // End of central directory signature có mặt ở cuối
    expect(buf.includes(Buffer.from([0x50, 0x4b, 0x05, 0x06]))).toBe(true);
  });

  it("chứa đủ các phần XML bắt buộc của xlsx", () => {
    const s = buf.toString("latin1");
    expect(s).toContain("[Content_Types].xml");
    expect(s).toContain("xl/workbook.xml");
    expect(s).toContain("xl/styles.xml");
    expect(s).toContain("xl/worksheets/sheet1.xml");
  });

  it("luôn có ít nhất 1 sheet kể cả khi truyền mảng rỗng", () => {
    const empty = buildXlsx([]);
    expect(empty.toString("latin1")).toContain("xl/worksheets/sheet1.xml");
  });
});
