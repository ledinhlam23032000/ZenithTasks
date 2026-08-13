import { redirect } from "next/navigation";
import { requireCap } from "@/lib/auth";
import { getClinicConfig } from "@/lib/clinic-config";
import { ClinicProfileForm } from "@/app/(app)/he-thong/profile-form";
import { Settings2 } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thiết lập phòng khám" };

/** Điểm vào onboarding có kiểm soát; các bước tài khoản/2FA dùng quy trình nhân sự hiện có. */
export default async function SetupPage() {
  try {
    await requireCap("clinic.settings.manage");
  } catch {
    redirect("/login");
  }
  const config = await getClinicConfig();
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className="flex items-start gap-3">
          <span className="rounded-xl bg-brand-50 p-3 text-brand-700"><Settings2 className="h-5 w-5" /></span>
          <div><h1 className="text-2xl font-semibold text-slate-900">Thiết lập phòng khám</h1><p className="mt-1 text-sm text-slate-500">Hoàn tất thông tin thương hiệu trước khi đưa hệ thống vào vận hành.</p></div>
        </header>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7"><ClinicProfileForm config={config} /></div>
      </div>
    </main>
  );
}
