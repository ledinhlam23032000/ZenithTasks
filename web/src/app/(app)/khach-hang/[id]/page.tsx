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
  AlertTriangle,
  Clock3,
} from "lucide-react";
import { differenceInYears, format } from "date-fns";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { isShareholder } from "@/lib/rbac";
import { tierFor, pointsFor, nextTier } from "@/lib/loyalty";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { aiConfigured } from "@/lib/ai";
import { formatVND } from "@/lib/money";
import { fmtDate, fmtDateTime, fmtRelative } from "@/lib/format";
import {
  GENDER_LABEL,
  SOURCE_LABEL,
  CASE_STATUS,
  CONSULT_RESULT,
  CARE_CHANNEL,
  APPT_STATUS,
} from "@/lib/status";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { DeleteButton } from "@/components/ui/delete-button";
import { FollowUpArriveButton } from "@/components/ui/follow-up-arrive-button";
import { receiveCustomer } from "../../tiep-nhan/actions";
import { deleteCustomer } from "../actions";
import { deleteCareMessage } from "../../cham-soc/actions";
import { EditCustomerButton } from "../edit-customer";
import { AdminPhone } from "./admin-phone";
import { PortalLink } from "./portal-link";
import { CareComposer } from "../../cham-soc/care-composer";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { summarizeCase } from "@/lib/financial-summary";
import { PhotoCompareButton } from "@/components/ui/photo-compare";
import { CustomerNextActions } from "./customer-next-actions";
import { MedicalAlert } from "@/components/ui/medical-alert";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCap("mod:khach-hang");
  const { id } = await params;
  const caseScope: Prisma.CaseRecordWhereInput =
    user.role === "CONSULTANT" ? { consultantId: user.id } : user.role === "DOCTOR" ? { doctorId: user.id } : {};
  const scopedClinical = user.role === "CONSULTANT" || user.role === "DOCTOR";
  const canViewClinical = userCan(user, "case.clinical");

  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      cases: {
        where: caseScope,
        orderBy: { createdAt: "desc" },
        include: {
          services: { select: { name: true, listPrice: true, unitPrice: true, quantity: true, discount: true, finalPrice: true } },
          payments: { select: { amount: true } },
          consultant: { select: { fullName: true } },
          doctor: { select: { fullName: true } },
        },
      },
      photos: scopedClinical
        ? { where: { case: caseScope }, orderBy: { takenAt: "desc" } }
        : canViewClinical
          ? { orderBy: { takenAt: "desc" } }
          : { where: { id: "__hidden__" }, orderBy: { takenAt: "desc" } },
      careMessages: { orderBy: { createdAt: "desc" }, take: 30, include: { createdBy: { select: { fullName: true } } } },
      appointments: { orderBy: { scheduledAt: "desc" }, take: 8 },
      followUps: scopedClinical
        ? { where: { case: caseScope }, orderBy: { scheduledAt: "desc" }, take: 8 }
        : { orderBy: { scheduledAt: "desc" }, take: 8 },
      conversations: { orderBy: { lastMessageAt: "desc" }, take: 20, include: { channelAccount: { select: { kind: true, label: true, externalName: true } } } },
      createdBy: { select: { fullName: true } },
    },
  });

  if (!customer) notFound();

  const canSeePhone = userCan(user, "phone.full");
  const canConfirmFollowUp = !isShareholder(user.role);

  const caseFinancials = new Map(
    customer.cases.map((c) => [
      c.id,
      summarizeCase({ services: c.services, payments: c.payments, voucherAmount: c.voucherAmount, snapshot: c }),
    ]),
  );
  const totalValue = customer.cases.reduce((s, c) => s + (caseFinancials.get(c.id)?.total ?? 0), 0);
  const totalDebt = customer.cases.reduce((s, c) => s + (caseFinancials.get(c.id)?.debt ?? 0), 0);
  const age = customer.dob ? differenceInYears(new Date(), customer.dob) : null;

  // Thẻ thành viên: hạng & điểm theo tổng chi tiêu thực (tiền đã thanh toán)
  const lifetimePaid = customer.cases.reduce((s, c) => s + (caseFinancials.get(c.id)?.paid ?? 0), 0);
  const tier = tierFor(lifetimePaid);
  const points = pointsFor(lifetimePaid);
  const nxt = nextTier(lifetimePaid);

  const timeline = [
    ...customer.cases.map((item) => ({ at: item.createdAt, type: "Hồ sơ", title: `Mở hồ sơ ${item.code}`, detail: `${CASE_STATUS[item.status].label} · ${CONSULT_RESULT[item.consultResult].label}`, href: `/ho-so/${item.id}` })),
    ...customer.appointments.map((item) => ({ at: item.scheduledAt, type: "Lịch hẹn", title: item.serviceInterest ? `Hẹn ${item.serviceInterest}` : "Lịch hẹn", detail: APPT_STATUS[item.status]?.label ?? item.status, href: "/lich-hen" })),
    ...customer.followUps.map((item) => ({ at: item.scheduledAt, type: "Follow-up", title: "Lịch chăm sóc/tái khám", detail: item.note ?? item.status, href: `/ho-so/${item.caseId}` })),
    ...customer.careMessages.map((item) => ({ at: item.createdAt, type: "CSKH", title: `${CARE_CHANNEL[item.channel].label} · ${item.createdBy?.fullName ?? "Nhân viên"}`, detail: item.content.slice(0, 120), href: "/cham-soc" })),
    ...customer.conversations.map((item) => ({ at: item.lastMessageAt, type: item.channelAccount.kind === "FACEBOOK" ? "Facebook" : "Zalo OA", title: item.channelAccount.externalName ?? item.channelAccount.label, detail: item.lastMessagePreview ?? "Có hội thoại", href: `/cham-soc/hop-thu/${item.id}` })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 30);

  const canReceive = ["ADMIN", "RECEPTION", "CONSULTANT", "DOCTOR", "MANAGER"].includes(user.role);
  const canCare = ["ADMIN", "MANAGER", "CARE"].includes(user.role);
  const canEdit = ["ADMIN", "MANAGER", "RECEPTION", "TELESALE"].includes(user.role);
  const latestCase = customer.cases[0];
  const nextSchedule = [
    ...customer.appointments.filter((a) => a.scheduledAt >= new Date() && ["BOOKED", "CONFIRMED"].includes(a.status)),
    ...customer.followUps.filter((f) => f.scheduledAt >= new Date() && ["BOOKED", "CONFIRMED"].includes(f.status)),
  ].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())[0];
  const nextActions = [
    nextSchedule && userCan(user, "mod:lich-hen")
      ? {
          icon: "calendar" as const,
          label: "Xem lịch sắp tới",
          detail: `${fmtDateTime(nextSchedule.scheduledAt)} · Mở lịch hợp nhất`,
          href: `/lich-hen?date=${format(nextSchedule.scheduledAt, "yyyy-MM-dd")}`,
        }
      : null,
    latestCase && userCan(user, "mod:ho-so")
      ? {
          icon: "case" as const,
          label: "Mở hồ sơ điều trị",
          detail: `${latestCase.code} · ${CASE_STATUS[latestCase.status].label}`,
          href: `/ho-so/${latestCase.id}`,
        }
      : null,
    totalDebt > 0 && userCan(user, "payment.add") && latestCase && userCan(user, "mod:ho-so")
      ? {
          icon: "wallet" as const,
          label: "Xử lý công nợ",
          detail: `Còn nợ ${formatVND(totalDebt)} · mở finance rail`,
          href: `/ho-so/${latestCase.id}`,
        }
      : null,
    canCare
      ? {
          icon: "care" as const,
          label: "Ghi nhận chăm sóc",
          detail: customer.careMessages.length > 0 ? "Xem lịch sử và ghi nhận tiếp" : "Khách chưa có lịch sử chăm sóc",
          href: "/cham-soc",
        }
      : null,
  ].filter((action): action is NonNullable<typeof action> => action !== null);

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
                  allergies: customer.allergies,
                  medicalHistory: customer.medicalHistory,
                  contraindications: customer.contraindications,
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

      {canViewClinical && (
        <MedicalAlert
          allergies={customer.allergies}
          medicalHistory={customer.medicalHistory}
          contraindications={customer.contraindications}
        />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Số lượt khám" value={customer.cases.length} icon={<FolderHeart className="h-5 w-5" />} tone="brand" />
        <StatCard label="Tổng giá trị dịch vụ" value={formatVND(totalValue)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <StatCard label="Công nợ còn lại" value={formatVND(totalDebt)} icon={<Receipt className="h-5 w-5" />} tone={totalDebt > 0 ? "red" : "slate"} />
      </div>

      <CustomerNextActions actions={nextActions} />

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-brand-500" /> Timeline khách hàng 360°</CardTitle></CardHeader>
        <CardContent className="pt-0">
          {timeline.length === 0 ? <EmptyState title="Chưa có hoạt động" /> : <ol className="relative ml-2 border-l border-slate-200 pl-5">{timeline.map((event, index) => <li key={`${event.type}-${event.at.toISOString()}-${index}`} className="relative pb-4 last:pb-0"><span className="absolute -left-[1.47rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-brand-500 ring-1 ring-brand-200" /><div className="flex flex-wrap items-baseline justify-between gap-2"><Link href={event.href} className="text-sm font-semibold text-slate-800 hover:text-brand-700">{event.title}</Link><time className="text-xs text-slate-400">{fmtDateTime(event.at)}</time></div><p className="mt-0.5 text-xs text-slate-500"><span className="font-medium text-brand-600">{event.type}</span> · {event.detail}</p></li>)}</ol>}
        </CardContent>
      </Card>

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
                            {(caseFinancials.get(c.id)?.anomalies.length ?? 0) > 0 && (
                              <span title="Số liệu tài chính hồ sơ này cần đối soát — mở hồ sơ để xem chi tiết.">
                                <Badge tone="amber">
                                  <AlertTriangle className="h-3 w-3" /> Cần đối soát
                                </Badge>
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400">{fmtDate(c.createdAt)}</span>
                        </div>
                        <p className="mt-1 line-clamp-1 text-sm text-slate-600">
                          {c.services.length > 0 ? c.services.map((s) => s.name).join(", ") : c.chiefComplaint || "Chưa có dịch vụ"}
                        </p>
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                          <span>Tổng: <b className="text-slate-700">{formatVND(caseFinancials.get(c.id)?.total ?? 0)}</b></span>
                          <span>Đã trả: <b className="text-emerald-600">{formatVND(caseFinancials.get(c.id)?.paid ?? 0)}</b></span>
                          {(caseFinancials.get(c.id)?.debt ?? 0) > 0 && <span>Nợ: <b className="text-rose-600">{formatVND(caseFinancials.get(c.id)?.debt ?? 0)}</b></span>}
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
              {canViewClinical && <PhotoCompareButton photos={customer.photos} />}
            </CardHeader>
            <CardContent className="pt-0">
              {!canViewClinical || customer.photos.length === 0 ? (
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
                  {customer.followUps.map((f) => {
                    const arrived = f.status !== "BOOKED" && f.status !== "CONFIRMED";
                    return (
                      <li key={f.id} className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-2 text-slate-600">
                          <Stethoscope className="h-4 w-4 text-violet-500" /> Tái khám
                        </span>
                        <span className="flex items-center gap-2">
                          {arrived ? (
                            <Badge tone={APPT_STATUS[f.status].tone}>{APPT_STATUS[f.status].label}</Badge>
                          ) : (
                            canConfirmFollowUp && <FollowUpArriveButton id={f.id} caseId={f.caseId} />
                          )}
                          <span className="text-slate-500">{fmtDateTime(f.scheduledAt)}</span>
                        </span>
                      </li>
                    );
                  })}
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
