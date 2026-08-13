import { notFound } from "next/navigation";
import { Crown, FolderHeart, Images, CalendarClock, Receipt } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatVND } from "@/lib/money";
import { fmtDate, fmtDateTime } from "@/lib/format";
import { CASE_STATUS } from "@/lib/status";
import { tierFor, pointsFor } from "@/lib/loyalty";
import { Badge } from "@/components/ui/badge";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { summarizeCase } from "@/lib/financial-summary";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hồ sơ của tôi" };

export default async function CustomerPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const followUpCutoff = new Date();
  followUpCutoff.setDate(followUpCutoff.getDate() - 1);
  const customer = await prisma.customer.findFirst({
    where: { portalToken: token, portalTokenExpiresAt: { gt: new Date() } },
    include: {
      cases: {
        orderBy: { createdAt: "desc" },
        include: {
          services: { select: { name: true, listPrice: true, unitPrice: true, quantity: true, discount: true } },
          payments: { select: { amount: true } },
        },
      },
      photos: { orderBy: { takenAt: "desc" }, take: 12 },
      followUps: { where: { scheduledAt: { gte: followUpCutoff } }, orderBy: { scheduledAt: "asc" }, take: 5 },
    },
  });
  if (!customer) notFound();

  const caseFinancials = new Map(
    customer.cases.map((c) => [
      c.id,
      summarizeCase({ services: c.services, payments: c.payments, voucherAmount: c.voucherAmount, snapshot: c }),
    ]),
  );
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
                    <Badge tone={CASE_STATUS[c.status].tone}>{CASE_STATUS[c.status].label}</Badge>
                    <span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-700">
                    {c.services.length > 0 ? c.services.map((s) => s.name).join(", ") : c.chiefComplaint || "—"}
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

        {/* Ảnh trước - sau */}
        {customer.photos.length > 0 && (
          <Section icon={<Images className="h-4 w-4 text-brand-500" />} title="Ảnh trước - sau">
            <PhotoGallery photos={customer.photos} cols={4} accessToken={token} />
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
