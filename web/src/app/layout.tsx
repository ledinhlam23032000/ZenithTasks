import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";
import { getClinicConfig } from "@/lib/clinic-config";

const appSans = Be_Vietnam_Pro({
  variable: "--font-app-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const clinic = await getClinicConfig();
  return {
    title: {
      default: `${clinic.brandName} — ${clinic.legalName}`,
      template: `%s · ${clinic.legalName}`,
    },
    description: `Ứng dụng quản trị ${clinic.brandName} — ${clinic.legalName}.`,
    robots: { index: false, follow: false },
    applicationName: clinic.legalName,
    appleWebApp: { capable: true, title: clinic.legalName, statusBarStyle: "default" },
    icons: {
      icon: clinic.faviconUrl || "/icons/icon-192.png",
      apple: clinic.faviconUrl || "/icons/apple-touch-icon.png",
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#dc2626",
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
