// Nén ảnh PHÍA TRÌNH DUYỆT trước khi tải lên: thu nhỏ kích thước + JPEG.
// Ảnh điện thoại 4–8MB sẽ còn ~200–600KB → tải lên nhanh hơn rất nhiều.
// Nếu trình duyệt không giải mã được (vd HEIC) thì trả về tệp gốc (không chặn).
export async function compressImage(file: File, maxDim = 1920, quality = 0.82): Promise<File> {
  if (typeof window === "undefined") return file;
  if (!file.type.startsWith("image/")) return file;
  try {
    // imageOrientation: "from-image" để ảnh chụp dọc từ điện thoại không bị xoay.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    const blob: Blob | null = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file; // không nén được nhỏ hơn thì giữ gốc
    const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], name, { type: "image/jpeg" });
  } catch {
    return file;
  }
}
