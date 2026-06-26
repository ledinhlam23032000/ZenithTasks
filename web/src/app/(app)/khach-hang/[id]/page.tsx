import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Cake,
  MapPin,
  Tag,
  FolderHeart,
  Wallet,
  Receipt,
  Images,
  MessageCircleHeart,
  CalendarClock,
  Stethoscope,
  FilePlus2,
  Crown,
  Share2,
} from "lucide-react";
import { differenceInYears, format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { tierFor, pointsFor, nextTier } from "@/lib/loyalty";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { aiConfigured } from "@/lib/ai";
import { toNum, formatVND } from "@/lib/money";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import {
  GENDER_LABEL,
  SOURCE_LABEL,
  CASE_STATUS,
  CONSULT_RESULT,
  CARE_CHANNEL,
  APPT_STATUS,
} from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { receiveCustomer } from "../../tiep-nhan/actions";
import { deleteCustomer } from "../actions";
import { deleteCareMessage } from "../../cham-soc/actions";
import { EditCustomerButton } from "../edit-customer";
import { AdminPhone } from "./admin-phone";
import { PortalLink } from "./portal-link";
import { CareComposer } from "../../cham-soc/care-composer";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { PhotoCompareButton } from "@/components/ui/photo-compare";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCap("mod:khach-hang");
  const { id } = await params;

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      cases: {
        orderBy: { createdAt: "desc" },
        include: {
          services: { select: { name: true } },
          consultant: { select: { fullName: true } },
          doctor: { select: { fullName: true } },
        },
      },
      photos: { orderBy: { takenAt: "desc" } },
      careMessages: { orderBy: { createdAt: "desc" }, take: 30, include: { createdBy: { select: { fullName: true } } } },
      appointments: { orderBy: { scheduledAt: "desc" }, take: 8 },
      followUps: { orderBy: { scheduledAt: "desc" }, take: 8 },
      createdBy: { select: { fullName: true } },
    },
  });

  if (!customer) notFound();

  const canSeePhone = userCan(user, "phone.full");

  const totalValue = customer.cases.reduce((s, c) => s + toNum(c.totalAmount), 0);
  const totalDebt = customer.cases.reduce((s, c) => s + toNum(c.debtAmount), 0);
  const age = customer.dob ? differenceInYears(new Date(), customer.dob) : null;

  // Thẻ thành viên: hạng & điểm theo tổng chi tiêu thực (tiền đã thanh toán)
  const lifetimePaid = customer.cases.reduce((s, c) => s + toNum(c.paidAmount), 0);
  const tier = tierFor(lifetimePaid);
  const points = pointsFor(lifetimePaid);
  const nxt = nextTier(lifetimePaid);

  const canReceive = ["ADMIN", "RECEPTION", "CONSULTANT", "DOCTOR", "MANAGER"].includes(user.role);
  const canCare = ["ADMIN", "MANAGER", "CARE"].includes(user.role);
  const canEdit = ["ADMIN", "MANAGER", "RECEPTION", "TELESALE"].includes(user.role);

  return (
    <div className="space-y-6">
      <Link href="/khach-hang" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Danh sách khách hàng
      </Link>

      {/* Hồ sơ khách */}
      <Card>
        <CardContent className="flex flex-wrap items-start gap-5 py-5">
          <Avatar name={customer.fullName} className="h-16 w-16 text-xl" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{customer.fullName}</h1>
              <Badge tone="slate">{customer.code}</Badge>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-brand-500" />
                {canSeePhone ? <AdminPhone customerId={customer.id} last5={customer.phoneLast5} /> : maskPhone(customer.phoneLast5)}
              </span>
              <span>{customer.gender ? GENDER_LABEL[customer.gender] : "—"}</span>
              {customer.dob && (
                <span className="inline-flex items-center gap-1.5">
                  <Cake className="h-4 w-4 text-slate-400" /> {fmtDate(customer.dob)}
                  {age !== null ? ` · ${age} tuổi` : ""}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Tag className="h-4 w-4 text-slate-400" /> {SOURCE_LABEL[customer.source]}
                {customer.sourceDetail ? ` · ${customer.sourceDetail}` : ""}
              </span>
              {customer.address && (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-slate-400" /> {customer.address}
                </span>
              )}
            </div>
            {customer.note && <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{customer.note}</p>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <EditCustomerButton
                customer={{
                  id: customer.id,
                  fullName: customer.fullName,
                  gender: customer.gender,
                  dob: customer.dob ? format(customer.dob, "yyyy-MM-dd") : null,
                  source: customer.source,
                  sourceDetail: customer.sourceDetail,
                  address: customer.address,
                  note: customer.note,
                  phoneLast5: customer.phoneLast5,
                }}
              />
            )}
            {canReceive && (
              <form action={receiveCustomer}>
                <input type="hidden" name="customerId" value={customer.id} />
                <button className={buttonVariants()}>
                  <FilePlus2 className="h-4 w-4" /> Mở hồ sơ điều trị
                </button>
              </form>
            )}
            {user.role === "ADMIN" && (
              <DeleteButton
                action={deleteCustomer}
                id={customer.id}
                label="Xóa khách"
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                confirmText={`Xóa vĩnh viễn hồ sơ "${customer.fullName}" cùng toàn bộ hồ sơ điều trị, thanh toán, ảnh và lịch hẹn? Không thể hoàn tác.`}
              />
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Số lượt khám" value={customer.cases.length} icon={<FolderHeart className="h-5 w-5" />} tone="brand" />
        <StatCard label="Tổng giá trị dịch vụ" value={formatVND(totalValue)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <StatCard label="Công nợ còn lại" value={formatVND(totalDebt)} icon={<Receipt className="h-5 w-5" />} tone={totalDebt > 0 ? "red" : "slate"} />
      </div>

      {/* Thẻ thành viên */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <Crown className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-slate-500">Hạng thành viên:</span>
                <Badge tone={tier.tone}>{tier.label}</Badge>
                {tier.discount > 0 && <span className="text-xs font-medium text-emerald-600">Ưu đãi {tier.discount}%</span>}
              </div>
              <p className="mt-0.5 text-xs text-slate-400">
                Điểm tích lũy: <b className="text-slate-700">{points.toLocaleString("vi-VN")}</b> · Tổng chi tiêu: {formatVND(lifetimePaid)}
              </p>
            </div>
          </div>
          {nxt && (
            <p className="text-xs text-slate-400">
              Còn <b className="text-slate-600">{formatVND(nxt.min - lifetimePaid)}</b> để lên hạng {nxt.label}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Cổng khách hàng (link riêng cho khách) */}
      {canEdit && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-brand-500" /> Cổng khách hàng
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <PortalLink customerId={customer.id} token={customer.portalToken} />
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Hồ sơ điều trị */}
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderHeart className="h-4 w-4 text-brand-500" /> Hồ sơ điều trị
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {customer.cases.length === 0 ? (
                <EmptyState title="Chưa có hồ sơ điều trị" description="Bấm “Mở hồ sơ điều trị” để bắt đầu tư vấn." />
              ) : (
                <ul className="space-y-2.5">
                  {customer.cases.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/ho-so/${c.id}`}
                        className="block rounded-xl border border-slate-200 p-3.5 transition hover:border-brand-300 hover:bg-brand-50/30"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{c.code}</span>
                            <Badge tone={CASE_STATUS[c.status].tone}>{CASE_STATUS[c.status].label}</Badge>
                            <Badge tone={CONSULT_RESULT[c.consultResult].tone}>{CONSULT_RESULT[c.consultResult].label}</Badge>
                          </div>
                          <span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-slate-600">
                          {c.services.length > 0 ? c.services.map((s) => s.name).join(", ") : c.chiefComplaint || "Chưa có dịch vụ"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Tổng: <b className="text-slate-700">{formatVND(c.totalAmount)}</b></span>
                          <span>Đã trả: <b className="text-emerald-600">{formatVND(c.paidAmount)}</b></span>
                          {toNum(c.debtAmount) > 0 && <span>Nợ: <b className="text-rose-600">{formatVND(c.debtAmount)}</b></span>}
                          {c.consultant && <span>TV: {c.consultant.fullName}</span>}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Ảnh trước - sau */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Images className="h-4 w-4 text-brand-500" /> Ảnh trước - sau
              </CardTitle>
              <PhotoCompareButton photos={customer.photos} />
            </CardHeader>
            <CardContent className="pt-0">
              {customer.photos.length === 0 ? (
                <EmptyState title="Chưa có ảnh" description="Ảnh trước/sau và cận lâm sàng được bác sĩ cập nhật trong hồ sơ điều trị." />
              ) : (
                <PhotoGallery photos={customer.photos} cols={4} />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chăm sóc + lịch hẹn */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircleHeart className="h-4 w-4 text-accent-500" /> Chăm sóc khách hàng
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              {canCare && <CareComposer customerId={customer.id} aiEnabled={aiConfigured()} />}
              {customer.careMessages.length === 0 ? (
                <p className="text-sm text-slate-400">Chưa có lịch sử chăm sóc.</p>
              ) : (
                <ul className="space-y-3">
                  {customer.careMessages.map((m) => {
                    const ch = CARE_CHANNEL[m.channel];
                    return (
                      <li key={m.id} className="border-l-2 border-slate-100 pl-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <Badge tone={ch.tone}>{ch.label}</Badge>
                            <span className="text-xs text-slate-400">
                              {m.direction === "IN" ? "Khách phản hồi" : "Gửi khách"}
                            </span>
                          </div>
                          {canCare && (
                            <DeleteButton
                              action={deleteCareMessage}
                              id={m.id}
                              label=""
                              confirmText="Xóa ghi chú chăm sóc này?"
                              className="text-slate-300 hover:text-rose-500"
                            />
                          )}
                        </div>
                        <p className="mt-1 text-sm text-slate-700">{m.content}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {m.createdBy?.fullName ?? "Hệ thống"} · {fmtRelative(m.createdAt)}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-brand-500" /> Lịch hẹn &amp; tái khám
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {customer.appointments.length === 0 && customer.followUps.length === 0 ? (
                <p className="text-sm text-slate-400">Chưa có lịch hẹn.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {customer.followUps.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <Stethoscope className="h-4 w-4 text-violet-500" /> Tái khám
                      </span>
                      <span className="text-slate-500">{fmtDateTime(f.scheduledAt)}</span>
                    </li>
                  ))}
                  {customer.appointments.map((a) => (
                    <li key={a.id} className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-slate-600">
                        <CalendarClock className="h-4 w-4 text-sky-500" /> {a.serviceInterest ?? "Lịch hẹn"}
                      </span>
                      <span className="flex items-center gap-2">
                        <Badge tone={APPT_STATUS[a.status].tone}>{APPT_STATUS[a.status].label}</Badge>
                        <span className="text-slate-400">{fmtDate(a.scheduledAt)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
