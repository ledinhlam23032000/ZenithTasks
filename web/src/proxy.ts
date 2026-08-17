import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { buildContentSecurityPolicy, createCspNonce } from "@/lib/security-headers";

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
  const nonce = createCspNonce();
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const secure = (response: NextResponse): NextResponse => {
    response.headers.set("Content-Security-Policy", buildContentSecurityPolicy(nonce));
    return response;
  };

  const token = request.cookies.get(COOKIE_NAME)?.value;
  let hasValidSession = false;
  let mustChangePassword = false;
  if (token) {
    try {
      const verified = await jwtVerify(token, secret());
      hasValidSession = true;
      mustChangePassword = verified.payload.mustChangePassword === true;
    } catch {
      hasValidSession = false;
    }
  }

  // Compatibility path: files are no longer written below public/. Return a
  // hard 404 so an old file cannot become public if it is left in an image or
  // during a rolling deployment.
  if (pathname.startsWith("/uploads/")) {
    return secure(new NextResponse("Not found", { status: 404 }));
  }

  if (!hasValidSession && !isPublic) {
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname);
    const res = NextResponse.redirect(url);
    if (token) res.cookies.delete({ name: COOKIE_NAME, path: "/" });
    return secure(res);
  }

  if (hasValidSession && mustChangePassword && pathname !== "/tai-khoan" && !pathname.startsWith("/tai-khoan/")) {
    const url = new URL("/tai-khoan", request.url);
    url.searchParams.set("force", "1");
    return secure(NextResponse.redirect(url));
  }

  if (hasValidSession && pathname === "/login") {
    return secure(NextResponse.redirect(new URL("/dashboard", request.url)));
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return secure(response);
}

export const config = {
  matcher: [
    // Bỏ qua tài nguyên tĩnh và API — CHỪA "uploads" (được xử lý riêng ở entry dưới,
    // vì pattern ".*\\..*" ở đây cũng khớp mọi đường dẫn có dấu chấm nên tự loại
    // "/uploads/<f>.jpg" luôn nếu không tách riêng).
    "/((?!api|_next/static|_next/image|favicon.ico|img|uploads|.*\\..*).*)",
    "/uploads/:path*",
  ],
};
