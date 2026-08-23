import Link from "next/link";
import { ArrowLeft, Handshake, Users, Wallet, Coins, Receipt, Phone, Landmark, StickyNote, FileText, Banknote } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { getCollaboratorDetail, getCollaboratorSeries, rangeBounds } from "@/lib/performance";
import { prisma } from "@/lib/db";
import { RangeChart } from "@/components/ui/range-chart";
import { NewCollaboratorButton, EditCollaboratorButton } from "../ctv-forms";
import { formatVND, toNum } from "@/lib/money";
import { fmtDate } from "@/lib/format";
import { CASE_STATUS } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { UploadCollaboratorDocumentButton, DeleteCollaboratorDocumentButton, RecordCollaboratorPayoutButton } from "../ctv-document-widgets";

export const dynamic = "force-dynamic";

const RANGES = [
  { key: "7d", label: "7 ngày" },
  { key: "month", label: "Tháng này" },
  { key: "year", label: "Năm nay" },
  { key: "all", label: "Tất cả" },
];

export default async function CollaboratorDetail({
  params,
  searchParams,
}: {
  params: Promise<{ name: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireCap("mod:cong-tac-vien");
  const canManage = user.role === "ADMIN" || user.role === "MANAGER";
  const identifier = decodeURIComponent((await params).name);
  const range = (await searchParams).range ?? "month";
  const { gte, lte, label } = rangeBounds(range);
  const [d, growth] = await Promise.all([getCollaboratorDetail(identifier, gte, lte), getCollaboratorSeries(identifier)]);
  const p = d.profile;
  const name = d.name;
  const documents = p
    ? await prisma.collaboratorDocument.findMany({
        where: { collaboratorId: p.id },
        orderBy: { createdAt: "desc" },
        select: { id: true, title: true, fileName: true, url: true, mime: true, createdAt: true, uploadedBy: { select: { fullName: true } } },
      })
    : [];
  const payoutRecords = p
    ? await prisma.collaboratorPayoutRecord.findMany({
        where: { collaboratorId: p.id },
        orderBy: { paidAt: "desc" },
        select: { id: true, amount: true, month: true, note: true, paidAt: true, paidBy: { select: { fullName: true } }, paymentRequest: { select: { requestNo: true } } },
      })
    : [];

  return (
    <div className="space-y-6">
      <Link href={`/cong-tac-vien?range=${range}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700">
        <ArrowLeft className="h-4 w-4" /> Danh sách cộng tác viên
      </Link>

      <PageHeader
        title={name}
        description={`Cộng tác viên · ${label}${p ? ` · ID ${p.id}` : " · dữ liệu legacy"}`}
        icon={<Avatar name={name} className="h-11 w-11 text-base" />}
        actions={
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            {RANGES.map((r) => (
              <Link
                key={r.key}
                href={`/cong-tac-vien/${encodeURIComponent(p?.id ?? identifier)}?range=${r.key}`}
                className={`rounded-md px-3 py-1 ${range === r.key ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {r.label}
              </Link>
            ))}
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Khách giới thiệu" value={d.customers} icon={<Users className="h-5 w-5" />} tone="brand" />
        <StatCard label="Số ca" value={d.cases.length} icon={<Receipt className="h-5 w-5" />} tone="blue" />
        <StatCard label="Doanh số mang về" value={formatVND(d.revenue)} icon={<Wallet className="h-5 w-5" />} tone="green" />
        <StatCard label="Hoa hồng" value={formatVND(d.commission)} icon={<Coins className="h-5 w-5" />} tone="amber" />
      </div>

      {/* Hồ sơ cộng tác viên */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Handshake className="h-4 w-4 text-brand-500" /> Hồ sơ cộng tác viên
          </CardTitle>
          {canManage &&
            (p ? (
              <EditCollaboratorButton
                ctv={{ id: p.id, name: p.name, phone: p.phone ?? "", bankAccount: p.bankAccount ?? "", bankName: p.bankName ?? "", bankHolder: p.bankHolder ?? "", note: p.note ?? "" }}
              />
            ) : (
              <NewCollaboratorButton defaultName={name} />
            ))}
        </CardHeader>
        <CardContent className="pt-0">
          {p ? (
            <dl className="grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">SĐT:</span>
                <span className="font-medium text-slate-800">{p.phone || "—"}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Landmark className="h-4 w-4 text-slate-400" />
                <span className="text-slate-500">Ngân hàng:</span>
                <span className="font-medium text-slate-800">{[p.bankName, p.bankAccount, p.bankHolder].filter(Boolean).join(" · ") || "—"}</span>
              </div>
              {p.note && (
                <div className="flex items-start gap-2 text-sm sm:col-span-2">
                  <StickyNote className="mt-0.5 h-4 w-4 text-slate-400" />
                  <span className="whitespace-pre-wrap text-slate-600">{p.note}</span>
                </div>
              )}
            </dl>
          ) : (
            <p className="text-sm text-slate-500">
              Chưa có hồ sơ cho CTV này.{canManage ? ' Bấm "Đăng ký CTV" để tạo hồ sơ; tên legacy có thể đổi và dữ liệu cũ sẽ được giữ nguyên.' : ""}
            </p>
          )}
        </CardContent>
      </Card>

      {p && (
        <div className="grid gap-6 xl:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-brand-500" /> Tài liệu hồ sơ
              </CardTitle>
              {canManage && <UploadCollaboratorDocumentButton collaboratorId={p.id} />}
            </CardHeader>
            <CardContent className="pt-0">
              {documents.length === 0 ? (
                <EmptyState title="Chưa có tài liệu" description="Tải hợp đồng, cam kết, ảnh hoặc giấy tờ liên quan lên để tra cứu về sau." />
              ) : (
                <ul className="space-y-2.5">
                  {documents.map((doc) => (
                    <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 p-2.5">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-800">{doc.title}</p>
                        <p className="truncate text-xs text-slate-500">{doc.fileName} · {fmtDate(doc.createdAt)}{doc.uploadedBy?.fullName ? ` · ${doc.uploadedBy.fullName}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <a href={doc.url} target="_blank" rel="noreferrer" className="rounded-md px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">Xem</a>
                        {canManage && <DeleteCollaboratorDocumentButton id={doc.id} collaboratorId={p.id} title={doc.title} />}
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
                <Banknote className="h-4 w-4 text-emerald-600" /> Lịch sử chi hoa hồng
              </CardTitle>
              {canManage && <RecordCollaboratorPayoutButton collaboratorId={p.id} />}
            </CardHeader>
            <CardContent className="overflow-x-auto pt-0">
              {payoutRecords.length === 0 ? (
                <EmptyState title="Chưa có khoản chi nào" description="Chỉ ghi nhận số tiền thực tế đã chuyển; hệ thống không tự tính lại hoa hồng." />
              ) : (
                <Table>
                  <THead>
                    <TR className="hover:bg-transparent">
                      <TH>Kỳ</TH>
                      <TH className="text-right">Số tiền</TH>
                      <TH>Ngày chi</TH>
                      <TH>Người ghi nhận</TH>
                      <TH>Ghi chú</TH>
                    </TR>
                  </THead>
                  <tbody>
                    {payoutRecords.map((record) => (
                      <TR key={record.id}>
                        <TD className="font-medium text-slate-700">{record.month}</TD>
                        <TD className="text-right font-semibold tabular-nums text-emerald-700">{formatVND(toNum(record.amount))}</TD>
                        <TD className="whitespace-nowrap text-slate-500">{fmtDate(record.paidAt)}</TD>
                        <TD className="text-slate-500">{record.paidBy?.fullName ?? "—"}{record.paymentRequest?.requestNo ? <span className="block text-xs text-slate-400">{record.paymentRequest.requestNo}</span> : null}</TD>
                        <TD className="max-w-[16rem] whitespace-pre-wrap text-slate-500">{record.note || "—"}</TD>
                      </TR>
                    ))}
                  </tbody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tăng trưởng doanh số</CardTitle>
          <span className="text-sm text-slate-400">Theo tuần / tháng / năm</span>
        </CardHeader>
        <CardContent>
          <RangeChart series={growth} valueLabel="Doanh số" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-brand-500" /> Hồ sơ khách do CTV giới thiệu
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto pt-0">
          {d.cases.length === 0 ? (
            <EmptyState title="Chưa có ca nào trong kỳ" />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Mã ca / Khách</TH>
                  <TH>Trạng thái</TH>
                  <TH className="text-right">Thành tiền</TH>
                  <TH className="text-right">Hoa hồng</TH>
                  <TH>Ngày</TH>
                </TR>
              </THead>
              <tbody>
                {d.cases.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/ho-so/${c.id}`} className="group">
                        <span className="font-semibold text-slate-800 group-hover:text-brand-600">{c.code}</span>
                        <span className="block text-xs text-slate-400">{c.customer?.fullName ?? "—"}</span>
                      </Link>
                    </TD>
                    <TD><Badge tone={CASE_STATUS[c.status].tone}>{CASE_STATUS[c.status].label}</Badge></TD>
                    <TD className="text-right font-semibold tabular-nums text-slate-800">{formatVND(c.totalAmount)}</TD>
                    <TD className="text-right tabular-nums text-violet-600">{formatVND(toNum(c.commissionAmount))}</TD>
                    <TD className="text-slate-500">{fmtDate(c.createdAt)}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
