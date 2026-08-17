import { headers } from "next/headers";

// ============================================================================
// Suy ra origin công khai (https://domain-that-khach-thay) của app — CẦN cho URL
// callback OAuth Zalo + URL hiển thị cho admin dán vào Zalo/Facebook. Ưu tiên
// header X-Forwarded-* vì app chạy sau Cloudflare Tunnel/reverse proxy (xem
// BAN-GIAO.md mục 1): kết nối thật tới tiến trình Node thường là http nội bộ dù
// khách vào bằng https, nên KHÔNG được tin trực tiếp giao thức của request gốc.
// ============================================================================

function pick(h: { get(name: string): string | null }, fallbackProto: string, fallbackHost: string): string {
  const proto = (h.get("x-forwarded-proto") ?? fallbackProto).split(",")[0].trim();
  const host = (h.get("x-forwarded-host") ?? fallbackHost).split(",")[0].trim();
  return `${proto}://${host}`;
}

/** Dùng trong Route Handler (có `Request` thật). */
export function originFromRequest(req: Request): string {
  const url = new URL(req.url);
  return pick(req.headers, url.protocol.replace(":", ""), url.host);
}

/** Dùng trong Server Component (không có `Request`) — đọc qua `next/headers`. */
export async function originFromHeaders(): Promise<string> {
  const h = await headers();
  return pick(h, "https", h.get("host") ?? "");
}
