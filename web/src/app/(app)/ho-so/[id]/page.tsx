import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ShieldCheck,
  Stethoscope,
  Wallet,
  Package,
  Images,
  Trash2,
  RefreshCw,
  ClipboardList,
  Receipt,
  Lock,
  Unlock,
  Boxes,
  FileSignature,
  FileText,
  ExternalLink,
  Printer,
} from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { toNum, formatVND } from "@/lib/money";
import { fmtDate, fmtDateTime, toDatetimeLocal } from "@/lib/format";
import { addDays } from "date-fns";
import { CASE_STATUS, CONSULT_RESULT, PAYMENT_LABEL, GENDER_LABEL, APPT_STATUS } from "@/lib/status";
import { getActiveServices, getActiveMaterials, getConsultants, getDoctors, getNurses } from "@/lib/lookups";
import { summarizeCase, correctedFinalPrice } from "@/lib/financial-summary";
import { canAccessCase } from "@/lib/case-access";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FollowUpArriveButton } from "@/components/ui/follow-up-arrive-button";
import { buttonVariants } from "@/components/ui/button";
import { PhotoGallery } from "@/components/ui/photo-gallery";
import { PhotoCompareButton } from "@/components/ui/photo-compare";
import { MedicalAlert } from "@/components/ui/medical-alert";
import { CaseSectionTabs, type CaseTab } from "./case-section-tabs";
import {
  CaseInfoForm,
  AddServiceButton,
  AddPaymentButton,
  AddMaterialButton,
  UploadPhotoButton,
  AddFollowUpButton,
  EditCaseServiceButton,
  EditPaymentButton,
  EditMaterialUsageButton,
  EditVoucherButton,
  EditCaseDateButton,
} from "./case-widgets";
import {
  removeCaseService,
  removeMaterial,
  deletePhoto,
  lockCase,
  unlockCase,
  deletePayment,
  deleteFollowUp,
  deleteCase,
  applyServiceBom,
} from "../actions";
import { deleteConsent } from "../consent-actions";
import { AddConsentButton } from "./consent-widgets";
import { deleteCaseDocument } from "../actions";
import { UploadDocumentButton } from "./case-document-widgets";
import { DebtPlanCard } from "./debt-plan-widgets";
import { debtPlanStatus } from "@/lib/debt-plan";
import { photoSrc } from "@/lib/media";
import { PaymentQrButton } from "./payment-qr-button";
import { RevenueAllocationEditor } from "./revenue-allocation-editor";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCap("mod:ho-so");
  const { id } = await params;

  const [record, services, materials, consultants, doctors, nurses, consentTemplates] = await Promise.all([
    prisma.caseRecord.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, code: true, phoneLast5: true, gender: true, allergies: true, medicalHistory: true, contraindications: true } },
        consultant: { select: { fullName: true } },
        doctor: { select: { fullName: true } },
        services: { orderBy: { createdAt: "asc" }, include: { doctor: { select: { fullName: true } } } },
        payments: { orderBy: { paidAt: "desc" }, include: { receivedBy: { select: { fullName: true } } } },
        materials: { orderBy: { performedAt: "desc" }, include: { performedBy: { select: { fullName: true } } } },
        photos: { orderBy: { takenAt: "desc" } },
        followUps: { orderBy: { scheduledAt: "desc" }, include: { createdBy: { select: { fullName: true } } } },
        consents: { orderBy: { signedAt: "desc" }, include: { createdBy: { select: { fullName: true } } } },
        documents: { orderBy: { createdAt: "desc" }, include: { uploadedBy: { select: { fullName: true } } } },
        debtPlan: true,
        revenueAllocations: { orderBy: { createdAt: "asc" }, include: { user: { select: { fullName: true } } } },
      },
    }),
    getActiveServices(),
    getActiveMaterials(),
    getConsultants(),
    getDoctors(),
    getNurses(),
    prisma.consentTemplate.findMany({ where: { active: true }, orderBy: { title: "asc" }, select: { id: true, title: true, body: true } }),
  ]);

  if (!record) notFound();
  if (!canAccessCase(user, record, "read")) notFound();

  // Đếm số dòng định mức (BOM) cho từng dịch vụ trong hồ sơ — để hiện nút "Trừ vật tư
  // theo định mức" chỉ ở những dịch vụ thực sự có khai báo định mức (B5 giai đoạn 2).
  const svcIds = [...new Set(record.services.map((s) => s.serviceId).filter((x): x is string => !!x))];
  const bomCounts = svcIds.length
    ? await prisma.serviceMaterial.groupBy({ by: ["serviceId"], where: { serviceId: { in: svcIds } }, _count: { _all: true } })
    : [];
  const bomCountMap = new Map(bomCounts.map((b) => [b.serviceId, b._count._all]));

  const isAdmin = user.role === "ADMIN";
  const lockedForMe = record.locked && !isAdmin;
  const canClinical = userCan(user, "case.clinical") && !lockedForMe;
  const canPay = !lockedForMe && userCan(user, "payment.add");

  const financial = summarizeCase({
    services: record.services,
    payments: record.payments,
    voucherAmount: record.voucherAmount,
    snapshot: record,
  });
  const total = financial.total;
  const paid = financial.paid;
  const debt = financial.debt;
  const discount = financial.lineDiscount;
  const voucher = financial.voucher;
  const gross = financial.gross;
  const anomalyLabels: Record<string, string> = {
    STALE_SNAPSHOT: "Tổng lưu trên hồ sơ cũ chưa khớp với các dòng chi tiết.",
    PAYMENT_WITHOUT_SERVICE: "Có khoản đã thu nhưng hồ sơ chưa có dịch vụ.",
    OVERPAYMENT: "Tổng đã thu đang lớn hơn thành tiền.",
    INVALID_DISCOUNT: "Có mức giảm giá không hợp lệ.",
    INVALID_VOUCHER: "Voucher đang lớn hơn giá trị dịch vụ.",
    INVALID_PAYMENT: "Có khoản thanh toán không hợp lệ.",
  };
  const commissionAmount = toNum(record.commissionAmount);
  const canVoidPayment = userCan(user, "payment.manage") && !lockedForMe;
  const allocationPeople = [...new Map([...consultants, ...doctors, ...nurses].map((person) => [person.id, person])).values()];

  // ----- Hẹn nợ (trả góp) — tính lịch + trạng thái để hiển thị (lib/debt-plan.ts) -----
  const dp = record.debtPlan;
  let debtPlanForm: { dayOfMonth: number; monthlyAmount: number; startDate: string; note: string } | null = null;
  let debtPlanSummary: { nextDue: string; monthly: string; monthsLeft: string; behind: string | null } | null = null;
  if (dp && debt > 0) {
    const monthly = toNum(dp.monthlyAmount);
    const paidSincePlan = record.payments.filter((p) => p.paidAt >= dp.createdAt).reduce((s, p) => s + toNum(p.amount), 0);
    const st = debtPlanStatus(
      { dayOfMonth: dp.dayOfMonth, monthlyAmount: monthly, startDate: dp.startDate },
      { debtRemaining: debt, originalDebt: debt + paidSincePlan, paidSincePlan, now: new Date() },
    );
    debtPlanForm = { dayOfMonth: dp.dayOfMonth, monthlyAmount: monthly, startDate: toDatetimeLocal(dp.startDate).slice(0, 10), note: dp.note ?? "" };
    debtPlanSummary = {
      nextDue: fmtDate(st.nextDue),
      monthly: formatVND(monthly),
      monthsLeft: st.monthsLeft === Infinity ? "—" : `~${st.monthsLeft} tháng (≈ ${fmtDate(st.finalDue)})`,
      behind: st.isBehind ? formatVND(st.behindAmount) : null,
    };
  }

  const rawTabs: (CaseTab | false)[] = [
    {
      key: "phan-bo-doanh-so",
      label: "Phối hợp DS",
      icon: <Wallet className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Wallet className="h-4 w-4 text-brand-500" /> Phối hợp &amp; phân bổ doanh số</CardTitle>
          </CardHeader>
          <CardContent>
            {isAdmin ? (
              <RevenueAllocationEditor
                caseId={record.id}
                people={allocationPeople}
                totalRevenue={total}
                initial={record.revenueAllocations.map((allocation) => ({ userId: allocation.userId, role: allocation.role, shareBps: allocation.shareBps, note: allocation.note }))}
              />
            ) : (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">Chỉ ADMIN được sửa phân bổ doanh số. Tổng doanh thu của hồ sơ là <b>{formatVND(total)}</b>; số liệu nhân sự chỉ lấy phần được phân bổ.</div>
            )}
          </CardContent>
        </Card>
      ),
    },
    canClinical && {
      key: "tu-van",
      label: "Tư vấn",
      icon: <Stethoscope className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-brand-500" /> Thông tin tư vấn
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CaseInfoForm
              caseId={record.id}
              consultants={consultants}
              doctors={doctors}
              initial={{
                status: record.status,
                consultResult: record.consultResult,
                consultantId: record.consultantId,
                doctorId: record.doctorId,
                commissionAmount,
                chiefComplaint: record.chiefComplaint,
                note: record.note,
              }}
            />
          </CardContent>
        </Card>
      ),
    },
    {
      key: "dich-vu",
      label: "Dịch vụ",
      icon: <Receipt className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-brand-500" /> Dịch vụ &amp; chi phí
            </CardTitle>
            {canClinical && <AddServiceButton caseId={record.id} services={services} nurses={nurses} />}
          </CardHeader>
          <CardContent className="pt-0">
            {record.services.length === 0 ? (
              <EmptyState title="Chưa có dịch vụ" description="Thêm dịch vụ khách đã chốt làm." />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Dịch vụ</TH>
                    <TH className="text-center">SL</TH>
                    <TH className="hidden text-right sm:table-cell">Giá gốc</TH>
                    <TH className="text-right">Ưu đãi</TH>
                    <TH className="text-right">Giảm</TH>
                    <TH className="text-right">Thành tiền</TH>
                    {canClinical && <TH />}
                  </TR>
                </THead>
                <tbody>
                  {record.services.map((s) => (
                    <TR key={s.id}>
                      <TD className="font-medium text-slate-800">{s.name}</TD>
                      <TD className="text-center">{s.quantity}</TD>
                      <TD className="hidden text-right text-slate-400 sm:table-cell">
                        {toNum(s.listPrice) > toNum(s.unitPrice) ? <span className="line-through">{formatVND(s.listPrice)}</span> : formatVND(s.listPrice)}
                      </TD>
                      <TD className="text-right">{formatVND(s.unitPrice)}</TD>
                      <TD className="text-right text-rose-500">{toNum(s.discount) > 0 ? `-${formatVND(s.discount)}` : "—"}</TD>
                      <TD className="text-right font-semibold text-slate-800">{formatVND(correctedFinalPrice(s))}</TD>
                      {canClinical && (
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            {s.serviceId && (bomCountMap.get(s.serviceId) ?? 0) > 0 && (
                              s.bomApplied ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-xs font-medium text-emerald-600" title="Đã trừ vật tư theo định mức">
                                  <Boxes className="h-3.5 w-3.5" /> Đã trừ VT
                                </span>
                              ) : (
                                <ConfirmButton
                                  action={applyServiceBom}
                                  fields={{ caseServiceId: s.id, caseId: record.id }}
                                  confirmText={`Trừ vật tư theo định mức cho dịch vụ "${s.name}" (× ${s.quantity} lần)? Hệ thống sẽ ghi nhận vật tư đã dùng và trừ kho.`}
                                  confirmLabel="Trừ vật tư"
                                  danger={false}
                                  className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-1.5 py-0.5 text-xs font-medium text-brand-600 hover:bg-brand-100"
                                >
                                  <Boxes className="h-3.5 w-3.5" /> Trừ VT
                                </ConfirmButton>
                              )
                            )}
                            <EditCaseServiceButton
                              caseId={record.id}
                              service={{ id: s.id, name: s.name, listPrice: toNum(s.listPrice), unitPrice: toNum(s.unitPrice), quantity: s.quantity, discount: toNum(s.discount), nurseId: s.nurseId }}
                              nurses={nurses}
                            />
                            <form action={removeCaseService}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="caseId" value={record.id} />
                              <button className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="Xóa">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        </TD>
                      )}
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      key: "vat-tu",
      label: "Vật tư",
      icon: <Package className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-4 w-4 text-brand-500" /> Vật tư sử dụng
            </CardTitle>
            {canClinical && <AddMaterialButton caseId={record.id} materials={materials} />}
          </CardHeader>
          <CardContent className="pt-0">
            {record.materials.length === 0 ? (
              <EmptyState title="Chưa ghi nhận vật tư" description="Bác sĩ ghi nhận vật tư đã dùng cho ca." />
            ) : (
              <Table>
                <THead>
                  <TR className="hover:bg-transparent">
                    <TH>Vật tư</TH>
                    <TH className="text-center">Số lượng</TH>
                    <TH>Người thực hiện</TH>
                    {canClinical && <TH />}
                  </TR>
                </THead>
                <tbody>
                  {record.materials.map((m) => (
                    <TR key={m.id}>
                      <TD className="font-medium text-slate-800">
                        {m.name}
                        {m.note && <span className="ml-1 text-xs text-slate-400">· {m.note}</span>}
                      </TD>
                      <TD className="text-center">{toNum(m.quantity)} {m.unit}</TD>
                      <TD className="text-slate-500">{m.performedBy?.fullName ?? "—"}</TD>
                      {canClinical && (
                        <TD className="text-right">
                          <div className="flex items-center justify-end gap-0.5">
                            <EditMaterialUsageButton
                              caseId={record.id}
                              usage={{ id: m.id, name: m.name, unit: m.unit, quantity: toNum(m.quantity), note: m.note ?? "" }}
                            />
                            <form action={removeMaterial}>
                              <input type="hidden" name="id" value={m.id} />
                              <input type="hidden" name="caseId" value={record.id} />
                              <button className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="Xóa">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
                          </div>
                        </TD>
                      )}
                    </TR>
                  ))}
                </tbody>
              </Table>
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      key: "hinh-anh",
      label: "Hình ảnh",
      icon: <Images className="h-4 w-4" />,
      content: (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Images className="h-4 w-4 text-brand-500" /> Ảnh trước - sau - tái khám
            </CardTitle>
            <div className="flex items-center gap-2">
              <PhotoCompareButton photos={record.photos} />
              {canClinical && <UploadPhotoButton caseId={record.id} customerId={record.customer.id} />}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {record.photos.length === 0 ? (
              <EmptyState title="Chưa có ảnh" description="Tải ảnh trước/sau, tái khám và ảnh cận lâm sàng (X-quang, CT, siêu âm)." />
            ) : (
              <PhotoGallery
                photos={record.photos}
                cols={3}
                caseId={record.id}
                deleteAction={canClinical ? deletePhoto : undefined}
              />
            )}
          </CardContent>
        </Card>
      ),
    },
    {
      key: "giay-to",
      label: "Giấy tờ",
      icon: <FileSignature className="h-4 w-4" />,
      content: (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSignature className="h-4 w-4 text-brand-500" /> Phiếu đồng ý
              </CardTitle>
              {canClinical && (
                <AddConsentButton
                  caseId={record.id}
                  customerName={record.customer.fullName}
                  caseCode={record.code}
                  services={record.services.map((s) => s.name).join(", ")}
                  templates={consentTemplates}
                  todayLocal={toDatetimeLocal(new Date()).slice(0, 10)}
                />
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {record.consents.length === 0 ? (
                <EmptyState title="Chưa có phiếu đồng ý" description="Ghi nhận phiếu đồng ý/cam kết khách đã ký (in ra cho khách ký tay)." />
              ) : (
                <ul className="space-y-2.5">
                  {record.consents.map((c) => (
                    <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800">{c.title}</p>
                        <p className="text-xs text-slate-500">
                          Người ký: {c.signerName}{c.relationship ? ` (${c.relationship})` : ""} · {fmtDate(c.signedAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/ho-so/${record.id}/consent/${c.id}`}
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                        >
                          <Printer className="h-3.5 w-3.5" /> In phiếu
                        </Link>
                        {canClinical && (
                          <ConfirmButton
                            action={deleteConsent}
                            fields={{ id: c.id, caseId: record.id }}
                            confirmText={`Xóa phiếu đồng ý "${c.title}"?`}
                            className="text-slate-300 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmButton>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-500" /> Giấy tờ hành chính
              </CardTitle>
              {canClinical && <UploadDocumentButton caseId={record.id} />}
            </CardHeader>
            <CardContent className="pt-0">
              {record.documents.length === 0 ? (
                <EmptyState title="Chưa có giấy tờ" description="Tải file đã soạn/đã ký sẵn (PDF, ảnh, Word…) lên rồi bấm Xem — khỏi gõ tay." />
              ) : (
                <ul className="space-y-2.5">
                  {record.documents.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{doc.title}</p>
                        <p className="truncate text-xs text-slate-500">
                          {doc.fileName} · {fmtDate(doc.createdAt)}
                          {doc.uploadedBy?.fullName ? ` · ${doc.uploadedBy.fullName}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <a
                          href={photoSrc(doc.url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Xem
                        </a>
                        {canClinical && (
                          <ConfirmButton
                            action={deleteCaseDocument}
                            fields={{ id: doc.id, caseId: record.id }}
                            confirmText={`Xóa giấy tờ "${doc.title}"?`}
                            className="text-slate-300 hover:text-rose-500"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </ConfirmButton>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      ),
    },
  ];
  const tabs: CaseTab[] = rawTabs.filter((t): t is CaseTab => !!t);

  return (
    <div className="space-y-6">
      <Link href={`/khach-hang/${record.customer.id}`} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Hồ sơ khách: {record.customer.fullName}
      </Link>

      <PageHeader
        title={`Hồ sơ ${record.code}`}
        icon={<ClipboardList className="h-5 w-5" />}
        description={`Mở ngày ${fmtDate(record.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Badge tone={CASE_STATUS[record.status].tone} dot>{CASE_STATUS[record.status].label}</Badge>
            <Badge tone={CONSULT_RESULT[record.consultResult].tone}>{CONSULT_RESULT[record.consultResult].label}</Badge>
            <Link href={`/ho-so/${record.id}/hoa-don`} className={`${buttonVariants({ variant: "secondary", size: "sm" })} print-hide`}>
              <Receipt className="h-3.5 w-3.5" /> In hóa đơn
            </Link>
            {isAdmin && <EditCaseDateButton caseId={record.id} createdAt={toDatetimeLocal(record.createdAt)} />}
            {isAdmin && (
              <ConfirmButton
                action={deleteCase}
                fields={{ id: record.id }}
                confirmText={`Xóa toàn bộ hồ sơ ${record.code} (dịch vụ, thanh toán, vật tư, tái khám)? Không thể hoàn tác.`}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" /> Xóa hồ sơ
              </ConfirmButton>
            )}
          </div>
        }
      />

      {record.locked ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="inline-flex items-center gap-2 text-sm font-medium text-amber-800">
            <Lock className="h-4 w-4" /> Hồ sơ đã khóa — nhân viên không thể chỉnh sửa. Chỉ quản trị viên mới mở lại được.
          </p>
          {isAdmin && (
            <form action={unlockCase}>
              <input type="hidden" name="caseId" value={record.id} />
              <button className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-700 hover:bg-amber-100">
                <Unlock className="h-4 w-4" /> Mở khóa
              </button>
            </form>
          )}
        </div>
      ) : (
        canClinical && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm text-slate-500">
              Hoàn tất rồi? Bấm <b>Lưu &amp; khóa</b> để chốt số liệu — sau khi khóa, nhân viên sẽ không sửa được nữa.
            </p>
            <ConfirmButton
              action={lockCase}
              fields={{ caseId: record.id }}
              confirmText="Sau khi LƯU & KHÓA, nhân viên sẽ KHÔNG thể chỉnh sửa hồ sơ này nữa (chỉ quản trị viên mở lại được). Tiếp tục?"
              confirmLabel="Khóa hồ sơ"
              danger={false}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900"
            >
              <Lock className="h-4 w-4" /> Lưu &amp; khóa hồ sơ
            </ConfirmButton>
          </div>
        )
      )}

      {/* Thẻ khách */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4 py-4">
          <Avatar name={record.customer.fullName} className="h-12 w-12" />
          <div className="flex-1">
            <Link href={`/khach-hang/${record.customer.id}`} className="font-semibold text-slate-800 hover:text-brand-600">
              {record.customer.fullName}
            </Link>
            <p className="text-sm text-slate-500">
              {record.customer.code} · <ShieldCheck className="inline h-3.5 w-3.5 text-brand-500" /> {maskPhone(record.customer.phoneLast5)}
              {record.customer.gender ? ` · ${GENDER_LABEL[record.customer.gender]}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-slate-500">Tư vấn: <b className="text-slate-700">{record.consultant?.fullName ?? "—"}</b></span>
            <span className="text-slate-500">Bác sĩ: <b className="text-slate-700">{record.doctor?.fullName ?? "—"}</b></span>
          </div>
        </CardContent>
      </Card>

      {canClinical && (
        <MedicalAlert
          allergies={record.customer.allergies}
          medicalHistory={record.customer.medicalHistory}
          contraindications={record.customer.contraindications}
          compact
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CaseSectionTabs tabs={tabs} defaultTab={canClinical ? "tu-van" : "dich-vu"} />
        </div>

        {/* Cột phải: tài chính + tái khám — luôn hiện sẵn (cần xem cùng lúc lúc thao tác dịch vụ/thanh toán) */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-brand-500" /> Tài chính
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {financial.anomalies.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900" role="alert">
                  <p className="font-semibold">Cần đối soát dữ liệu tài chính</p>
                  <ul className="mt-1 list-disc space-y-0.5 pl-4">
                    {financial.anomalies.map((anomaly) => <li key={anomaly}>{anomalyLabels[anomaly] ?? anomaly}</li>)}
                  </ul>
                </div>
              )}
              <Row label="Tổng dịch vụ (giá gốc)" value={formatVND(gross)} />
              {discount > 0 && <Row label="Đã giảm ưu đãi" value={`-${formatVND(discount)}`} valueClass="text-rose-500" />}
              {voucher > 0 && (
                <Row label={`Voucher${record.voucherCode ? ` · ${record.voucherCode}` : ""}`} value={`-${formatVND(voucher)}`} valueClass="text-violet-600" />
              )}
              {(discount > 0 || voucher > 0) && <Row label="Thành tiền" value={formatVND(total)} valueClass="text-slate-900" />}
              <Row label="Đã thanh toán" value={formatVND(paid)} valueClass="text-emerald-600" />
              <div className="my-1 h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Còn nợ</span>
                <span className={`text-xl font-bold ${debt > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatVND(debt)}</span>
              </div>
              {commissionAmount > 0 && (
                <div className="flex items-center justify-between border-t border-dashed border-slate-100 pt-2 text-sm">
                  <span className="text-slate-500">Hoa hồng CTV</span>
                  <span className="font-semibold text-violet-600">{formatVND(commissionAmount)}</span>
                </div>
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {canPay && <AddPaymentButton caseId={record.id} debt={debt} />}
                <PaymentQrButton caseCode={record.code} amount={debt} />
                {canVoidPayment && <EditVoucherButton caseId={record.id} voucher={{ amount: voucher, code: record.voucherCode ?? "" }} />}
              </div>

              {record.payments.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lịch sử thu</p>
                  {record.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-slate-700">{formatVND(p.amount)}</span>
                        <span className="ml-1.5 text-xs text-slate-400">{PAYMENT_LABEL[p.method]}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-400">{fmtDate(p.paidAt)}</span>
                        {canVoidPayment && (
                          <>
                            <EditPaymentButton
                              caseId={record.id}
                              isAdmin={isAdmin}
                              payment={{ id: p.id, amount: toNum(p.amount), method: p.method, note: p.note ?? "", paidAt: toDatetimeLocal(p.paidAt) }}
                            />
                            <ConfirmButton
                              action={deletePayment}
                              fields={{ id: p.id, caseId: record.id }}
                              confirmText={`Xóa khoản thu ${formatVND(p.amount)}?`}
                              className="text-slate-300 hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmButton>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(debt > 0 || dp) && (
                <DebtPlanCard
                  caseId={record.id}
                  canManage={canPay}
                  plan={debtPlanForm}
                  summary={debtPlanSummary}
                  settled={!!dp && debt <= 0}
                  defaultDay={new Date().getDate()}
                  todayLocal={toDatetimeLocal(new Date()).slice(0, 10)}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-violet-500" /> Tái khám
              </CardTitle>
              {canClinical && (
                <AddFollowUpButton
                  caseId={record.id}
                  customerId={record.customer.id}
                  defaultDateTime={toDatetimeLocal(new Date(addDays(new Date(), 7).setHours(9, 0, 0, 0)))}
                />
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {record.followUps.length === 0 ? (
                <p className="text-sm text-slate-400">Chưa có lịch tái khám.</p>
              ) : (
                <ul className="space-y-2.5">
                  {record.followUps.map((f) => {
                    const arrived = f.status !== "BOOKED" && f.status !== "CONFIRMED";
                    return (
                      <li key={f.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 p-2.5">
                        <div>
                          <p className="text-sm font-medium text-slate-700">{fmtDateTime(f.scheduledAt)}</p>
                          {f.note && <p className="text-xs text-slate-500">{f.note}</p>}
                        </div>
                        <div className="flex items-center gap-2">
                          {arrived ? (
                            <Badge tone={APPT_STATUS[f.status].tone}>{APPT_STATUS[f.status].label}</Badge>
                          ) : (
                            canClinical && <FollowUpArriveButton id={f.id} caseId={record.id} />
                          )}
                          {canClinical && (
                            <ConfirmButton
                              action={deleteFollowUp}
                              fields={{ id: f.id, caseId: record.id }}
                              confirmText="Xóa lịch tái khám này?"
                              className="mt-0.5 text-slate-300 hover:text-rose-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </ConfirmButton>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, valueClass = "text-slate-800" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
