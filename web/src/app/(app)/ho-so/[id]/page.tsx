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
} from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
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
import { PhotoTypeLabel } from "./photo-label";
import {
  CaseInfoForm,
  AddServiceButton,
  AddPaymentButton,
  AddMaterialButton,
  UploadPhotoButton,
  AddFollowUpButton,
} from "./case-widgets";
import { removeCaseService, removeMaterial, deletePhoto } from "../actions";

export const dynamic = "force-dynamic";

export default async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser(["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR", "RECEPTION"]);
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

  const canClinical = ["ADMIN", "MANAGER", "CONSULTANT", "DOCTOR"].includes(user.role);
  const canPay = canClinical || user.role === "RECEPTION";

  const total = toNum(record.totalAmount);
  const paid = toNum(record.paidAmount);
  const debt = toNum(record.debtAmount);
  const discount = toNum(record.discountAmount);

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
          </div>
        }
      />

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
                      <TH className="text-right">Đơn giá</TH>
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
                        <TD className="text-right">{formatVND(s.unitPrice)}</TD>
                        <TD className="text-right text-rose-500">{toNum(s.discount) > 0 ? `-${formatVND(s.discount)}` : "—"}</TD>
                        <TD className="text-right font-semibold text-slate-800">{formatVND(s.finalPrice)}</TD>
                        {canClinical && (
                          <TD className="text-right">
                            <form action={removeCaseService}>
                              <input type="hidden" name="id" value={s.id} />
                              <input type="hidden" name="caseId" value={record.id} />
                              <button className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="Xóa">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
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
                            <form action={removeMaterial}>
                              <input type="hidden" name="id" value={m.id} />
                              <input type="hidden" name="caseId" value={record.id} />
                              <button className="rounded-md p-1.5 text-slate-300 hover:bg-rose-50 hover:text-rose-500" aria-label="Xóa">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </form>
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
                      <img src={p.url} alt={p.caption ?? "Ảnh"} className="aspect-square w-full object-cover" />
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
              <Row label="Tổng dịch vụ" value={formatVND(total)} />
              {discount > 0 && <Row label="Đã giảm" value={`-${formatVND(discount)}`} valueClass="text-rose-500" />}
              <Row label="Đã thanh toán" value={formatVND(paid)} valueClass="text-emerald-600" />
              <div className="my-1 h-px bg-slate-100" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Còn nợ</span>
                <span className={`text-xl font-bold ${debt > 0 ? "text-rose-600" : "text-emerald-600"}`}>{formatVND(debt)}</span>
              </div>
              {canPay && (
                <div className="pt-1">
                  <AddPaymentButton caseId={record.id} debt={debt} />
                </div>
              )}

              {record.payments.length > 0 && (
                <div className="mt-3 space-y-2 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Lịch sử thu</p>
                  {record.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between text-sm">
                      <div>
                        <span className="font-medium text-slate-700">{formatVND(p.amount)}</span>
                        <span className="ml-1.5 text-xs text-slate-400">{PAYMENT_LABEL[p.method]}</span>
                      </div>
                      <span className="text-xs text-slate-400">{fmtDate(p.paidAt)}</span>
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
                    <li key={f.id} className="rounded-lg border border-slate-100 p-2.5">
                      <p className="text-sm font-medium text-slate-700">{fmtDateTime(f.scheduledAt)}</p>
                      {f.note && <p className="text-xs text-slate-500">{f.note}</p>}
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
