import { notFound } from "next/navigation";
import { Crown, FolderHeart, Images, CalendarClock, Receipt, Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/money";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { CASE_STATUS, CASE_STATUS_PORTAL } from "@/lib/status";
import { tierFor, pointsFor } from "@/lib/loyalty";
import { withMediaToken } from "@/lib/media-token";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { APPT_STATUS } from "@/lib/status";
import { PortalAppointmentActions } from "./appointment-actions";
import { PortalNpsForm } from "./nps-form";
import { summarizeCase } from "@/lib/financial-summary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hồ sơ của tôi" };

export default async function CustomerPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const now = new Date();
  const customer = await prisma.customer.findUnique({
    where: { portalToken: token },
    include: {
      // select TƯỜNG MINH (không dùng include) — trang công khai, tránh kéo nhầm field
      // nội bộ (vd chiefComplaint/ghi chú tư vấn) vào bộ nhớ rồi lỡ render ra cho khách.
      cases: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          createdAt: true,
          totalAmount: true,
          paidAmount: true,
          debtAmount: true,
          voucherAmount: true,
          services: { select: { name: true, listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
          payments: { select: { amount: true } },
        },
      },
      // The customer portal may show before/after progress, never internal
      // clinical images (X-ray/CT/ultrasound or similar records).
      photos: { where: { type: { not: "CLINICAL" } }, orderBy: { takenAt: "desc" }, take: 12 },
      followUps: { where: { scheduledAt: { gte: new Date(now.getTime() - 86400000) } }, orderBy: { scheduledAt: "asc" }, take: 5 },
      appointments: {
        where: { scheduledAt: { gte: new Date(now.getTime() - 3 * 3600000) }, status: { in: ["BOOKED", "CONFIRMED"] } },
        orderBy: { scheduledAt: "asc" },
        take: 5,
      },
      // Đã đánh giá trong 30 ngày gần đây chưa (ẩn form nếu vừa đánh giá).
      npsResponses: { where: { createdAt: { gte: new Date(now.getTime() - 30 * 86400000) } }, take: 1, select: { id: true } },
    },
  });
  if (!customer) notFound();

  // Link cổng khách hết hạn (D3 gđ2) → hiện thông báo thân thiện thay vì lộ dữ liệu.
  if (customer.portalTokenExpiresAt && customer.portalTokenExpiresAt.getTime() < now.getTime()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-slate-800">Liên kết đã hết hạn</p>
          <p className="mt-2 text-sm text-slate-500">Vui lòng liên hệ phòng khám (0941 567 496) để được cấp lại liên kết xem hồ sơ.</p>
        </div>
      </div>
    );
  }

  const canRate = customer.cases.length > 0 && customer.npsResponses.length === 0;

  const caseFinancials = new Map(customer.cases.map((c) => [c.id, summarizeCase({ services: c.services, payments: c.payments, voucherAmount: c.voucherAmount, snapshot: c })]));
  const lifetimePaid = customer.cases.reduce((s, c) => s + (caseFinancials.get(c.id)?.paid ?? 0), 0);
  const totalDebt = customer.cases.reduce((s, c) => s + (caseFinancials.get(c.id)?.debt ?? 0), 0);
  const tier = tierFor(lifetimePaid);
  const points = pointsFor(lifetimePaid);

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-50/60 to-slate-50 px-4 py-8">
      <div className="mx-auto max-w-2xl space-y-5">
        <header className="text-center">
          <p className="text-lg font-bold text-brand-700">Trung tâm Phẫu thuật Tạo hình Thẩm mỹ</p>
          <p className="text-sm text-slate-500">Bệnh viện Đa khoa Hồng Phúc</p>
        </header>

        {/* Thẻ thành viên */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">Xin chào,</p>
              <p className="text-xl font-semibold text-slate-900">{customer.fullName}</p>
            </div>
            <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Crown className="h-6 w-6" />
            </span>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <Badge tone={tier.tone}>Hạng {tier.label}</Badge>
            {tier.discount > 0 && <span className="text-emerald-600">Ưu đãi {tier.discount}%</span>}
            <span className="text-slate-400">· {points.toLocaleString("vi-VN")} điểm</span>
          </div>
        </div>

        {/* Lịch hẹn sắp tới — khách tự xác nhận / đề nghị đổi (D3) */}
        {customer.appointments.length > 0 && (
          <Section icon={<CalendarClock className="h-4 w-4 text-brand-500" />} title="Lịch hẹn sắp tới">
            <ul className="space-y-3">
              {customer.appointments.map((a) => (
                <li key={a.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{fmtDateTime(a.scheduledAt)}</span>
                    <Badge tone={APPT_STATUS[a.status].tone}>{APPT_STATUS[a.status].label}</Badge>
                  </div>
                  {a.serviceInterest && <p className="mt-0.5 text-xs text-slate-500">{a.serviceInterest}</p>}
                  <PortalAppointmentActions token={token} appointmentId={a.id} status={a.status} />
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Lịch tái khám sắp tới */}
        {customer.followUps.length > 0 && (
          <Section icon={<CalendarClock className="h-4 w-4 text-violet-500" />} title="Lịch tái khám sắp tới">
            <ul className="space-y-1.5 text-sm">
              {customer.followUps.map((f) => (
                <li key={f.id} className="flex items-center justify-between">
                  <span className="text-slate-700">{fmtDateTime(f.scheduledAt)}</span>
                  {f.note && <span className="text-xs text-slate-400">{f.note}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {/* Lịch sử điều trị */}
        <Section icon={<FolderHeart className="h-4 w-4 text-brand-500" />} title="Lịch sử điều trị">
          {customer.cases.length === 0 ? (
            <p className="text-sm text-slate-400">Chưa có lịch sử điều trị.</p>
          ) : (
            <ul className="space-y-2.5">
              {customer.cases.map((c) => (
                <li key={c.id} className="rounded-xl border border-slate-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge tone={CASE_STATUS[c.status].tone}>{CASE_STATUS_PORTAL[c.status]}</Badge>
                    <span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {/* KHÔNG hiện chiefComplaint (ghi chú nội bộ tư vấn viên) — chỉ hiện tên dịch vụ đã chốt. */}
                    {c.services.length > 0 ? c.services.map((s) => s.name).join(", ") : "Đang tư vấn"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Thành tiền: <b className="text-slate-700">{formatVND(caseFinancials.get(c.id)?.total ?? 0)}</b> · Đã trả: {formatVND(caseFinancials.get(c.id)?.paid ?? 0)}
                    {(caseFinancials.get(c.id)?.debt ?? 0) > 0 && <span className="text-rose-500"> · Còn nợ: {formatVND(caseFinancials.get(c.id)?.debt ?? 0)}</span>}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {/* Ảnh trước - sau (ký vé ngắn hạn cho từng ảnh vì trang này không đăng nhập) */}
        {customer.photos.length > 0 && (
          <Section icon={<Images className="h-4 w-4 text-brand-500" />} title="Ảnh trước - sau">
            <PhotoGallery photos={customer.photos.map((p) => ({ ...p, url: withMediaToken(p.url) }))} cols={4} />
          </Section>
        )}

        {totalDebt > 0 && (
          <div className="flex items-center justify-between rounded-2xl border border-rose-200 bg-rose-50 px-5 py-3">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-rose-700">
              <Receipt className="h-4 w-4" /> Công nợ còn lại
            </span>
            <span className="text-lg font-bold text-rose-600">{formatVND(totalDebt)}</span>
          </div>
        )}

        {/* Đánh giá trải nghiệm (NPS) — chỉ hiện khi khách đã có lịch sử điều trị & chưa đánh giá gần đây */}
        {canRate && (
          <Section icon={<Star className="h-4 w-4 text-amber-500" />} title="Đánh giá trải nghiệm">
            <PortalNpsForm token={token} />
          </Section>
        )}

        <p className="pt-2 text-center text-xs text-slate-400">
          Cảm ơn Quý khách! Mọi thắc mắc xin gọi 0941 567 496.
        </p>
      </div>
    </div>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
        {icon} {title}
      </h2>
      {children}
    </div>
  );
}
