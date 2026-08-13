import { getActiveServices } from "@/lib/lookups";
import { toDatetimeLocal } from "@/lib/format";
import { BookingForm } from "./booking-form";
import { getClinicConfig } from "@/lib/clinic-config";

export const dynamic = "force-dynamic";
export const metadata = { title: "Đặt lịch hẹn" };

export default async function PublicBookingPage() {
  const services = await getActiveServices();
  const clinic = await getClinicConfig();
  // Mặc định: 9h sáng ngày mai
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const def = toDatetimeLocal(tomorrow);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 to-slate-50 px-4 py-10">
      <div className="mx-auto max-w-lg">
        <header className="mb-6 text-center">
          <p className="text-xl font-bold text-brand-700">{clinic.brandName}</p>
          <p className="text-sm text-slate-500">{clinic.legalName}</p>
        </header>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <h1 className="mb-1 text-lg font-semibold text-slate-900">Đặt lịch hẹn</h1>
          <p className="mb-5 text-sm text-slate-500">Để lại thông tin, trung tâm sẽ liên hệ xác nhận lịch cho Quý khách.</p>
          <BookingForm services={services.map((s) => ({ id: s.id, name: s.name }))} defaultDateTime={def} />
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">Hỗ trợ: {clinic.hotline}</p>
      </div>
    </div>
  );
}
