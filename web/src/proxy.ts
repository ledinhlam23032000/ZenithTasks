import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Next.js 16: "proxy" thay cho "middleware", mặc định chạy Node.js runtime (không
// còn giới hạn Edge) → xác thực JWT thật ở đây an toàn, không cần "đoán" qua việc
// cookie có tồn tại hay không.
//
// TRƯỚC ĐÂY chỉ kiểm tra `cookies.has("zsession")`: cookie CÒN NẰM ĐÓ nhưng JWT đã
// hỏng (hết hạn, đổi AUTH_SECRET, sửa cookie thủ công) vẫn được coi là "đã đăng
// nhập" → vào /dashboard → trang tự gọi requireUser() phát hiện phiên không hợp lệ
// → redirect về /login → /login lại thấy cookie "có" → đẩy ngược về /dashboard →
// lặp vô hạn (ERR_TOO_MANY_REDIRECTS). Sửa: xác thực chữ ký JWT thật ở đây; cookie
// hỏng thì XOÁ NGAY trên response rồi mới chuyển hướng — cắt đứt vòng lặp.
const PUBLIC_PATHS = ["/login", "/dat-lich", "/khach"];
const COOKIE_NAME = "zsession";

function secret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET ?? "");
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let hasValidSession = false;
  if (token) {
    try {
      await jwtVerify(token, secret());
      hasValidSession = true;
    } catch {
      hasValidSession = false;
    }
  }

  if (!hasValidSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete({ name: COOKIE_NAME, path: "/" });
    return res;
  }

  if (hasValidSession && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Bỏ qua tài nguyên tĩnh và API
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|img|uploads|.*\\..*).*)"],
};
