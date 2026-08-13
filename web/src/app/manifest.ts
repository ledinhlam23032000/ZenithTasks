import type { MetadataRoute } from "next";
import { getClinicConfig } from "@/lib/clinic-config";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const clinic = await getClinicConfig();
  return {
    name: `${clinic.brandName} — ${clinic.legalName}`,
    short_name: clinic.legalName,
    description: `Ứng dụng quản trị ${clinic.brandName} — ${clinic.legalName}.`,
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f8fafc",
    theme_color: clinic.primaryColor,
    lang: "vi",
    icons: [
      { src: clinic.faviconUrl || "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: clinic.faviconUrl || "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
