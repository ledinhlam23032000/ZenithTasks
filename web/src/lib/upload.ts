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

/** Đuôi tệp ảnh nhận diện qua magic bytes → Content-Type tương ứng ở route /media. */
const IMAGE_MAGIC_EXT: Record<string, string> = { jpg: "jpg", png: "png", gif: "gif", webp: "webp", heic: "heic" };

/**
 * Dò định dạng ảnh THẬT qua vài byte đầu tệp — KHÔNG tin `file.type` do trình duyệt
 * gửi (chỉ đọc từ tên tệp/kê khai, dễ giả mạo). Trả về đuôi tệp chuẩn nếu nhận diện
 * được (JPEG/PNG/GIF/WEBP/HEIC), `null` nếu không phải ảnh bitmap được hỗ trợ.
 */
export function sniffImageExt(buf: Buffer): string | null {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return IMAGE_MAGIC_EXT.jpg;
  if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return IMAGE_MAGIC_EXT.png;
  if (buf.subarray(0, 4).toString("ascii") === "GIF8") return IMAGE_MAGIC_EXT.gif;
  if (buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP") return IMAGE_MAGIC_EXT.webp;
  // HEIC/HEIF: container ISO-BMFF, hộp "ftyp" ở byte thứ 4 (đủ để phân biệt với tệp
  // không phải ảnh; không cần phân loại chính xác từng mã hãng HEIC).
  if (buf.subarray(4, 8).toString("ascii") === "ftyp") return IMAGE_MAGIC_EXT.heic;
  return null;
}

/** Kiểm tra chữ ký file theo MIME khai báo, không tin phần mở rộng hay MIME tự gửi. */
export function isDocumentBufferValid(buf: Buffer, mime: string): boolean {
  if (buf.length < 4) return false;
  if (mime === "application/pdf") return buf.subarray(0, 5).toString("ascii") === "%PDF-";
  if (mime === "image/jpeg") return sniffImageExt(buf) === "jpg";
  if (mime === "image/png") return sniffImageExt(buf) === "png";
  if (mime === "image/webp") return sniffImageExt(buf) === "webp";
  if (mime === "application/msword" || mime === "application/vnd.ms-excel") {
    return buf.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
  }
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  ) {
    return buf.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  }
  return false;
}

export function prettyFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
