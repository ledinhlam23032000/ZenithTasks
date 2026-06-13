import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

const appSans = Be_Vietnam_Pro({
  variable: "--font-app-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Zenith Clinic — Quản lý Trung tâm Thẩm mỹ",
    template: "%s · Zenith Clinic",
  },
  description:
    "Hệ thống quản lý phòng khám thẩm mỹ: lịch hẹn, hồ sơ khách hàng, tư vấn, dịch vụ, chăm sóc khách hàng và báo cáo.",
  robots: { index: false, follow: false },
  applicationName: "Zenith Clinic",
  appleWebApp: { capable: true, title: "Zenith Clinic", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#0d9488",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi" className={`${appSans.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
