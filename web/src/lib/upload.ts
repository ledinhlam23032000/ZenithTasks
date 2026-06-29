// ============================================================================
// TỆP TẢI LÊN (giấy tờ hành chính) — danh mục định dạng cho phép + tiện ích THUẦN.
// Tách riêng để kiểm thử + tái dùng (server action upload + route phục vụ tệp).
// ============================================================================

/** Định dạng giấy tờ cho phép tải lên → đuôi tệp chuẩn hoá. */
export const DOC_MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
};

export function isAllowedDocMime(mime: string): boolean {
  return mime in DOC_MIME_EXT;
}

/** Đuôi tệp chuẩn theo MIME (ưu tiên), nếu không có thì lấy từ tên gốc đã làm sạch. */
export function docExt(mime: string, originalName = ""): string {
  if (DOC_MIME_EXT[mime]) return DOC_MIME_EXT[mime];
  const raw = (originalName.split(".").pop() || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return Object.values(DOC_MIME_EXT).includes(raw) ? raw : "bin";
}

/** Tên tệp LƯU (an toàn, chống path traversal) — KHÔNG dùng tên gốc trong đường dẫn. */
export function safeStoredName(prefix: string, ext: string): string {
  const p = (prefix || "doc").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40) || "doc";
  return `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
}

export function prettyFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
