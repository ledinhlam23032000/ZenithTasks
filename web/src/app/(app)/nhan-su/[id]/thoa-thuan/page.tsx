import Link from "next/link";
import { ArrowLeft, FileSignature, Printer } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { agreementTitle } from "@/lib/agreement-templates";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { CreateAgreementButton, RevokeAgreementButton, SignAgreementButton } from "./agreement-forms";

export const dynamic = "force-dynamic";
export const metadata = { title: "Thỏa thuận nhân sự" };

export default async function StaffAgreementsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireCap("mod:nhan-su");
  const { id } = await params;
  const staff = await prisma.user.findUnique({ where: { id }, select: { id: true, fullName: true, position: true } });
  if (!staff) return <EmptyState title="Không tìm thấy nhân sự" description="Hồ sơ có thể đã bị khóa hoặc xóa." />;
  const agreements = await prisma.staffAgreement.findMany({ where: { userId: id }, orderBy: [{ type: "asc" }, { version: "desc" }], include: { createdBy: { select: { fullName: true } } } });
  const statusTone: Record<string, "slate" | "green" | "red" | "amber"> = { DRAFT: "slate", SIGNED: "green", EXPIRED: "amber", REVOKED: "red" };
  return <div className="space-y-6">
    <PageHeader title={`Thỏa thuận — ${staff.fullName}`} description="Quản lý bản nháp, bản đã ký và thời hạn bảo mật/không cạnh tranh của nhân sự." icon={<FileSignature className="h-5 w-5" />} actions={<div className="flex flex-wrap gap-2"><Link href={`/nhan-su/${id}`} className={buttonVariants({ variant: "secondary" })}><ArrowLeft className="h-4 w-4" /> Về hồ sơ nhân sự</Link><CreateAgreementButton userId={id} /></div>} />
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"><strong>Lưu ý pháp lý:</strong> ứng dụng giúp tạo và theo dõi hồ sơ, không thay thế việc luật sư/lao động rà soát điều khoản, thời hạn và mức phạt trước khi ký chính thức.</div>
    <Card><CardHeader><CardTitle>Danh sách thỏa thuận</CardTitle></CardHeader><CardContent className="overflow-x-auto pt-0">{agreements.length === 0 ? <EmptyState title="Chưa có thỏa thuận" description="Tạo bản nháp bảo mật và không cạnh tranh cho nhân sự này." /> : <table className="w-full min-w-[900px] text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-400"><th className="px-3 py-3">Loại</th><th className="px-3 py-3">Version</th><th className="px-3 py-3">Trạng thái</th><th className="px-3 py-3">Ngày ký / hiệu lực</th><th className="px-3 py-3">Người tạo</th><th className="px-3 py-3 text-right">Thao tác</th></tr></thead><tbody>{agreements.map((item) => <tr key={item.id} className="border-b border-slate-100 align-top"><td className="px-3 py-3 font-medium text-slate-800">{agreementTitle(item.type as "CONFIDENTIALITY" | "NON_COMPETE")}</td><td className="px-3 py-3 text-slate-600">v{item.version}</td><td className="px-3 py-3"><Badge tone={statusTone[item.status] ?? "slate"}>{item.status === "SIGNED" ? "Đã ký" : item.status === "DRAFT" ? "Bản nháp" : item.status === "REVOKED" ? "Đã thu hồi" : "Hết hạn"}</Badge></td><td className="px-3 py-3 text-xs text-slate-500">{item.signedAt ? `Ký ${fmtDate(item.signedAt)}` : "Chưa ký"}<div className="mt-1">Hiệu lực: {item.effectiveFrom ? fmtDate(item.effectiveFrom) : "—"}{item.effectiveUntil ? ` → ${fmtDate(item.effectiveUntil)}` : ""}</div></td><td className="px-3 py-3 text-xs text-slate-500">{item.createdBy?.fullName ?? "—"}<div className="mt-1">{fmtDate(item.createdAt)}</div></td><td className="px-3 py-3"><div className="flex flex-wrap justify-end gap-1.5"><a href={`/nhan-su/${id}/thoa-thuan/${item.id}/export`} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"><Printer className="h-3.5 w-3.5" /> In</a>{item.status === "DRAFT" && <SignAgreementButton id={item.id} />}{item.status === "SIGNED" && <RevokeAgreementButton id={item.id} />}</div></td></tr>)}</tbody></table>}</CardContent></Card>
  </div>;
}
