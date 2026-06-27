import Link from "next/link";
import { UserSearch, Sparkles, TrendingUp, Trash2, ArrowRightCircle, Phone } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { maskPhone } from "@/lib/phone";
import { fmtDate } from "@/lib/format";
import { SOURCE_LABEL } from "@/lib/status";
import { LEAD_STATUSES, LEAD_STATUS_LABEL, LEAD_STATUS_TONE, summarizeLeads, type LeadStatusKey } from "@/lib/leads";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { AddLeadButton, EditLeadButton, LeadStatusSelect } from "./lead-widgets";
import { deleteLead, convertLeadToCustomer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Khách tham khảo" };

const TAKE = 300;

export default async function LeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; err?: string }> }) {
  await requireCap("mod:khach-tham-khao");
  const sp = await searchParams;
  const statusFilter = LEAD_STATUSES.includes(sp.status as LeadStatusKey) ? (sp.status as LeadStatusKey) : "all";

  const leads = await prisma.lead.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: TAKE,
    include: { createdBy: { select: { fullName: true } } },
  });

  const summary = summarizeLeads(leads.map((l) => ({ status: l.status as LeadStatusKey })));
  const filtered = statusFilter === "all" ? leads : leads.filter((l) => l.status === statusFilter);

  const qs = (s: string) => (s === "all" ? "/khach-tham-khao" : `/khach-tham-khao?status=${s}`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Khách tham khảo"
        description="Khách từ nhiều nguồn giới thiệu tới tham khảo dịch vụ — chưa hẹn, chưa đến. Theo dõi & chăm để chuyển thành khách."
        icon={<UserSearch className="h-5 w-5" />}
        actions={<AddLeadButton />}
      />

      {sp.err === "nophone" && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 ring-1 ring-amber-600/10">
          Cần có số điện thoại trước khi chuyển thành khách. Bấm sửa để bổ sung SĐT.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng khách tham khảo" value={String(summary.total)} icon={<UserSearch className="h-5 w-5" />} tone="brand" />
        <StatCard label="Đang theo đuổi" value={String(summary.open)} sub="Mới + đã liên hệ" icon={<Sparkles className="h-5 w-5" />} tone="amber" />
        <StatCard label="Đã chuyển khách" value={String(summary.byStatus.CONVERTED)} icon={<ArrowRightCircle className="h-5 w-5" />} tone="green" />
        <StatCard label="Tỉ lệ chuyển đổi" value={`${summary.conversionRate}%`} icon={<TrendingUp className="h-5 w-5" />} tone="purple" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5 text-xs font-medium">
            <Link href={qs("all")} className={`rounded-md px-3 py-1 ${statusFilter === "all" ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
              Tất cả ({summary.total})
            </Link>
            {LEAD_STATUSES.map((s) => (
              <Link key={s} href={qs(s)} className={`rounded-md px-3 py-1 ${statusFilter === s ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {LEAD_STATUS_LABEL[s]} ({summary.byStatus[s]})
              </Link>
            ))}
          </div>
        </div>

        <CardContent className="pt-0">
          {filtered.length === 0 ? (
            <EmptyState
              icon={<UserSearch className="h-6 w-6" />}
              title="Chưa có khách tham khảo"
              description="Thêm khách từ nguồn giới thiệu để theo dõi và chăm sóc trước khi họ đặt lịch."
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Khách</TH>
                  <TH>Nguồn</TH>
                  <TH>Quan tâm</TH>
                  <TH>Trạng thái</TH>
                  <TH className="text-right">Thao tác</TH>
                </TR>
              </THead>
              <tbody>
                {filtered.map((l) => (
                  <TR key={l.id}>
                    <TD>
                      <div className="font-medium text-slate-800">{l.fullName}</div>
                      <div className="flex items-center gap-1 text-xs text-slate-400">
                        {l.phoneLast5 ? (
                          <><Phone className="h-3 w-3" /> {maskPhone(l.phoneLast5)}</>
                        ) : (
                          <span className="italic">chưa có SĐT</span>
                        )}
                        <span className="ml-1">· {fmtDate(l.createdAt)}</span>
                      </div>
                    </TD>
                    <TD>
                      <Badge tone="slate">{SOURCE_LABEL[l.source]}</Badge>
                      {l.sourceDetail && <div className="text-xs text-slate-400">{l.sourceDetail}</div>}
                    </TD>
                    <TD className="max-w-[16rem]">
                      <span className="text-sm text-slate-600">{l.serviceInterest || "—"}</span>
                      {l.note && <div className="truncate text-xs text-slate-400">{l.note}</div>}
                    </TD>
                    <TD>
                      <div className="space-y-1">
                        <Badge tone={LEAD_STATUS_TONE[l.status as LeadStatusKey]}>{LEAD_STATUS_LABEL[l.status as LeadStatusKey]}</Badge>
                        <LeadStatusSelect id={l.id} status={l.status} />
                      </div>
                    </TD>
                    <TD>
                      <div className="flex items-center justify-end gap-2">
                        {l.status !== "CONVERTED" && l.phoneLast5 && (
                          <ConfirmButton
                            action={convertLeadToCustomer}
                            fields={{ id: l.id }}
                            confirmText={`Chuyển "${l.fullName}" thành khách hàng chính thức?`}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                          >
                            <ArrowRightCircle className="h-3.5 w-3.5" /> Chuyển khách
                          </ConfirmButton>
                        )}
                        <EditLeadButton
                          lead={{
                            id: l.id,
                            fullName: l.fullName,
                            phone: "",
                            source: l.source,
                            sourceDetail: l.sourceDetail ?? "",
                            serviceInterest: l.serviceInterest ?? "",
                            note: l.note ?? "",
                            status: l.status,
                            hasPhone: !!l.phoneEnc,
                          }}
                        />
                        <ConfirmButton
                          action={deleteLead}
                          fields={{ id: l.id }}
                          confirmText={`Xóa khách tham khảo "${l.fullName}"?`}
                          className="text-slate-300 hover:text-rose-500"
                        >
                          <Trash2 className="h-4 w-4" />
                        </ConfirmButton>
                      </div>
                    </TD>
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
