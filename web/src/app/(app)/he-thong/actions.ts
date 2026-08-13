"use server";

import { revalidatePath } from "next/cache";
import { requireCap } from "@/lib/auth";
import { clinicConfigSchema, getClinicConfig, saveClinicConfig, type ClinicConfig } from "@/lib/clinic-config";

export type ClinicConfigState = { ok?: boolean; error?: string };

export async function saveClinicProfile(_prev: ClinicConfigState, formData: FormData): Promise<ClinicConfigState> {
  const user = await requireCap("clinic.settings.manage");
  const current = await getClinicConfig();
  const parsed = clinicConfigSchema.safeParse({
    ...current,
    brandName: formData.get("brandName") ?? current.brandName,
    legalName: formData.get("legalName") ?? current.legalName,
    logoUrl: formData.get("logoUrl") ?? current.logoUrl,
    faviconUrl: formData.get("faviconUrl") ?? current.faviconUrl,
    primaryColor: formData.get("primaryColor") ?? current.primaryColor,
    secondaryColor: formData.get("secondaryColor") ?? current.secondaryColor,
    hotline: formData.get("hotline") ?? current.hotline,
    email: formData.get("email") ?? current.email,
    address: formData.get("address") ?? current.address,
    website: formData.get("website") ?? current.website,
    timezone: formData.get("timezone") ?? current.timezone,
    workingDays: formData.get("workingDays") ?? current.workingDays,
    bookingHours: formData.get("bookingHours") ?? current.bookingHours,
    privacyPolicy: formData.get("privacyPolicy") ?? current.privacyPolicy,
    portalGreeting: formData.get("portalGreeting") ?? current.portalGreeting,
    serviceCatalog: formData.get("serviceCatalog") ?? current.serviceCatalog,
    messageTemplates: formData.get("messageTemplates") ?? current.messageTemplates,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Cấu hình không hợp lệ." };
  await saveClinicConfig(parsed.data as ClinicConfig);
  await import("@/lib/audit").then(({ audit }) => audit(user.id, "UPDATE_CLINIC_CONFIG"));
  revalidatePath("/he-thong");
  revalidatePath("/login");
  revalidatePath("/dat-lich");
  revalidatePath("/khach");
  revalidatePath("/dashboard");
  return { ok: true };
}
