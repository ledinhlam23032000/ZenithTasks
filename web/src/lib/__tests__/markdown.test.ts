import { describe, it, expect } from "vitest";
import { parseInline, parseBlocks } from "../markdown";

describe("parseInline", () => {
  it("tách **đậm**, *nghiêng*, `mã`", () => {
    expect(parseInline("Dịch vụ **Căng da** giá `38tr` rất *tốt*")).toEqual([
      { t: "text", v: "Dịch vụ " },
      { t: "b", v: "Căng da" },
      { t: "text", v: " giá " },
      { t: "code", v: "38tr" },
      { t: "text", v: " rất " },
      { t: "i", v: "tốt" },
    ]);
  });
  it("không có markdown → 1 token text", () => {
    expect(parseInline("xin chào")).toEqual([{ t: "text", v: "xin chào" }]);
  });
  it("**đậm** không nuốt nhầm thành *nghiêng*", () => {
    const r = parseInline("**A**");
    expect(r).toEqual([{ t: "b", v: "A" }]);
  });
});

describe("parseBlocks", () => {
  it("tiêu đề + đoạn văn", () => {
    const b = parseBlocks("## Tổng quan\nDoanh thu tốt.");
    expect(b[0]).toEqual({ type: "h", level: 2, text: "Tổng quan" });
    expect(b[1]).toEqual({ type: "p", text: "Doanh thu tốt." });
  });
  it("danh sách gạch đầu dòng", () => {
    const b = parseBlocks("- Mục 1\n- Mục 2");
    expect(b).toEqual([{ type: "ul", items: ["Mục 1", "Mục 2"] }]);
  });
  it("danh sách đánh số", () => {
    const b = parseBlocks("1. Một\n2. Hai");
    expect(b).toEqual([{ type: "ol", items: ["Một", "Hai"] }]);
  });
  it("đoạn văn ngăn bởi dòng trống", () => {
    const b = parseBlocks("Đoạn A.\n\nĐoạn B.");
    expect(b).toEqual([
      { type: "p", text: "Đoạn A." },
      { type: "p", text: "Đoạn B." },
    ]);
  });
});
