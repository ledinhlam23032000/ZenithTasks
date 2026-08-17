import type { NextConfig } from "next";

// Cho phép thêm origin (khi chạy sau proxy/tên miền/Cloudflare Tunnel) qua biến
// môi trường APP_ORIGINS, ví dụ: "app.phongkham.com,*.trycloudflare.com".
const allowed = (process.env.APP_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // The repository sits below a broader Windows workspace that also has a
  // lockfile. Pin Turbopack to this app so production builds do not infer the
  // wrong workspace root.
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      // Mặc định 1MB là quá nhỏ cho ảnh trước–sau (tối đa ~8MB/ảnh).
      bodySizeLimit: "12mb",
      ...(allowed.length > 0 ? { allowedOrigins: allowed } : {}),
    },
  },
  // Các header bảo mật cơ bản (chống nhúng iframe, dò kiểu tệp, rò rỉ referrer…).
  async headers() {
    // HTML responses receive a per-request nonce in proxy.ts. This static
    // fallback covers assets and non-proxied responses without allowing
    // executable inline scripts.
    const csp = [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' https://img.vietqr.io data: blob:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; ");

    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
