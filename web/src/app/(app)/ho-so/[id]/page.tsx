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
} from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { photoSrc } from "@/lib/media";
import { toNum, formatVND } from "@/lib/money";
import { fmtDate, fmtDateTime, toDatetimeLocal } from "@/lib/format";
import { addDays } from "date-fns";
import { CASE_STATUS, CONSULT_RESULT, PAYMENT_LABEL, GENDER_LABEL } from "@/lib/status";
import { getActiveServices, getActiveMaterials, getConsultants, getDoctors } from "@/lib/lookups";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { buttonVariants } from "@/components/ui/button";
import { PhotoTypeLabel } from "./photo-label";
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
} from "../actions";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireCap("mod:ho-so");
  const { id } = await params;

  const [record, services, materials, consultants, doctors] = await Promise.all([
    prisma.caseRecord.findUnique({
      where: { id },
      include: {
        customer: { select: { id: true, fullName: true, code: true, phoneLast5: true, gender: true } },
        consultant: { select: { fullName: true } },
        doctor: { select: { fullName: true } },
        services: { orderBy: { createdAt: "asc" }, include: { doctor: { select: { fullName: true } } } },
        payments: { orderBy: { paidAt: "desc" }, include: { receivedBy: { select: { fullName: true } } } },
        materials: { orderBy: { performedAt: "desc" }, include: { performedBy: { select: { fullName: true } } } },
        photos: { orderBy: { takenAt: "desc" } },
        followUps: { orderBy: { scheduledAt: "desc" }, include: { createdBy: { select: { fullName: true } } } },
      },
    }),
    getActiveServices(),
    getActiveMaterials(),
    getConsultants(),
    getDoctors(),
  ]);

  if (!record) notFound();

  const isAdmin = user.role === "ADMIN";
  const lockedForMe = record.locked && !isAdmin;
  const canClinical = userCan(user, "case.clinical") && !lockedForMe;
  const canPay = !lockedForMe && userCan(user, "payment.add");

  const total = toNum(record.totalAmount);
  const paid = toNum(record.paidAmount);
  const debt = toNum(record.debtAmount);
  const discount = toNum(record.discountAmount);
  const voucher = toNum(record.voucherAmount);
  const gross = total + voucher + discount; // giá gốc trước ưu đãi & voucher (total = net sau voucher)
  const commissionAmount = toNum(record.commissionAmount);
  const canVoidPayment = userCan(user, "payment.manage") && !lockedForMe;

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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Thông tin tư vấn */}
          {canClinical && (
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
          )}

          {/* Dịch vụ */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-4 w-4 text-brand-500" /> Dịch vụ &amp; chi phí
              </CardTitle>
              {canClinical && <AddServiceButton caseId={record.id} services={services} />}
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
                        <TD className="text-right font-semibold text-slate-800">{formatVND(s.finalPrice)}</TD>
                        {canClinical && (
                          <TD className="text-right">
                            <div className="flex items-center justify-end gap-0.5">
                              <EditCaseServiceButton
                                caseId={record.id}
                                service={{ id: s.id, name: s.name, listPrice: toNum(s.listPrice), unitPrice: toNum(s.unitPrice), quantity: s.quantity, discount: toNum(s.discount) }}
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

          {/* Vật tư */}
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

          {/* Ảnh */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Images className="h-4 w-4 text-brand-500" /> Ảnh trước - sau - tái khám
              </CardTitle>
              {canClinical && <UploadPhotoButton caseId={record.id} customerId={record.customer.id} />}
            </CardHeader>
            <CardContent className="pt-0">
              {record.photos.length === 0 ? (
                <EmptyState title="Chưa có ảnh" description="Tải ảnh trước/sau và các lần tái khám." />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {record.photos.map((p) => (
                    <figure key={p.id} className="group relative overflow-hidden rounded-xl border border-slate-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={photoSrc(p.url)} alt={p.caption ?? "Ảnh"} className="aspect-square w-full object-cover" />
                      <figcaption className="flex items-center justify-between px-2 py-1.5">
                        <PhotoTypeLabel type={p.type} index={p.followUpIndex} />
                        <span className="text-[11px] text-slate-400">{fmtDate(p.takenAt)}</span>
                      </figcaption>
                      {canClinical && (
                        <form action={deletePhoto} className="absolute right-1.5 top-1.5 opacity-0 transition group-hover:opacity-100">
                          <input type="hidden" name="id" value={p.id} />
                          <input type="hidden" name="caseId" value={record.id} />
                          <button className="rounded-md bg-white/90 p-1.5 text-rose-500 shadow-sm hover:bg-white" aria-label="Xóa ảnh">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      )}
                    </figure>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Cột phải: tài chính + tái khám */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-brand-500" /> Tài chính
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
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
                  {record.followUps.map((f) => (
                    <li key={f.id} className="flex items-start justify-between gap-2 rounded-lg border border-slate-100 p-2.5">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{fmtDateTime(f.scheduledAt)}</p>
                        {f.note && <p className="text-xs text-slate-500">{f.note}</p>}
                      </div>
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

function Row({ label, value, valueClass = "text-slate-800" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-semibold ${valueClass}`}>{value}</span>
    </div>
  );
}
