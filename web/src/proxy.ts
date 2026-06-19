import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Next.js 16: "proxy" thay cho "middleware". Ở đây chỉ kiểm tra NHANH sự tồn tại
// của cookie phiên để chuyển hướng. Việc xác thực & phân quyền THỰC SỰ nằm trong
// requireUser() ở từng trang / Server Action (theo khuyến nghị bảo mật của Next).
const PUBLIC_PATHS = ["/login", "/dat-lich"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("zsession");
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  if (!hasSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Bỏ qua tài nguyên tĩnh và API
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img|uploads|.*\\..*).*)"],
};
