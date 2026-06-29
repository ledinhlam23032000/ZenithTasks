import { describe, it, expect } from "vitest";
import { isAllowedDocMime, docExt, safeStoredName, prettyFileSize } from "../upload";

describe("isAllowedDocMime", () => {
  it("nhận PDF/ảnh/Word/Excel, từ chối loại lạ", () => {
    expect(isAllowedDocMime("application/pdf")).toBe(true);
    expect(isAllowedDocMime("image/png")).toBe(true);
    expect(isAllowedDocMime("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true);
    expect(isAllowedDocMime("application/x-msdownload")).toBe(false);
    expect(isAllowedDocMime("text/html")).toBe(false);
  });
});

describe("docExt", () => {
  it("ưu tiên đuôi theo MIME", () => {
    expect(docExt("application/pdf")).toBe("pdf");
    expect(docExt("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe("docx");
  });
  it("MIME lạ → lấy đuôi sạch từ tên gốc nếu hợp lệ, không thì bin", () => {
    expect(docExt("application/octet-stream", "hoso.pdf")).toBe("pdf");
    expect(docExt("application/octet-stream", "abc.exe")).toBe("bin");
  });
});

describe("safeStoredName", () => {
  it("không chứa ký tự lạ / không chứa tên gốc", () => {
    const n = safeStoredName("HS00012", "pdf");
    expect(n).toMatch(/^HS00012-\d+-[a-z0-9]+\.pdf$/);
    expect(/[^A-Za-z0-9._-]/.test(n)).toBe(false);
  });
  it("prefix rỗng → 'doc'", () => {
    expect(safeStoredName("", "png")).toMatch(/^doc-/);
  });
});

describe("prettyFileSize", () => {
  it("B/KB/MB", () => {
    expect(prettyFileSize(500)).toBe("500 B");
    expect(prettyFileSize(2048)).toBe("2 KB");
    expect(prettyFileSize(3 * 1024 * 1024)).toBe("3.0 MB");
    expect(prettyFileSize(-5)).toBe("0 B");
  });
});
