import type { NextConfig } from "next";

// Cho phép thêm origin (khi chạy sau proxy/tên miền/Cloudflare Tunnel) qua biến
// môi trường APP_ORIGINS, ví dụ: "app.phongkham.com,*.trycloudflare.com".
const allowed = (process.env.APP_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Mặc định 1MB là quá nhỏ cho ảnh trước–sau (tối đa ~8MB/ảnh).
      bodySizeLimit: "12mb",
      ...(allowed.length > 0 ? { allowedOrigins: allowed } : {}),
    },
  },
};

export default nextConfig;
