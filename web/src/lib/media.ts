// Đường dẫn hiển thị ảnh: phục vụ qua route /media (đáng tin cậy ở production).
// Ảnh cũ lưu URL dạng /uploads/<tệp> → chuyển sang /media/<tệp>.
export function photoSrc(url: string | null | undefined): string {
  if (!url) return "";
  if (url.startsWith("/uploads/")) return "/media/" + url.slice("/uploads/".length);
  return url;
}
