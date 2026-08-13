// Đường dẫn hiển thị ảnh: phục vụ qua route /media (đáng tin cậy ở production).
// Ảnh cũ lưu URL dạng /uploads/<tệp> → chuyển sang /media/<tệp>.
export function photoSrc(url: string | null | undefined, accessToken?: string): string {
  if (!url) return "";
  const src = url.startsWith("/uploads/") ? "/media/" + url.slice("/uploads/".length) : url;
  if (!accessToken || !src.startsWith("/media/")) return src;
  return `${src}?t=${encodeURIComponent(accessToken)}`;
}
