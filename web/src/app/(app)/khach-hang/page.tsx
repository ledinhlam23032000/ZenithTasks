import Link from "next/link";
import { Users, FolderHeart, Search, ShieldCheck, Stethoscope } from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { fmtDate } from "@/lib/format";
import { GENDER_LABEL, SOURCE_LABEL } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Table, THead, TH, TR, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { NewCustomerButton } from "../tiep-nhan/new-customer";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Hồ sơ khách hàng" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireCap("mod:khach-hang");
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();

  let where: Prisma.CustomerWhereInput = {};
  if (q) {
    where = isValidLast5(q) ? { phoneLast5: q } : { fullName: { contains: q, mode: "insensitive" } };
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 60,
      select: {
        id: true,
        code: true,
        fullName: true,
        gender: true,
        phoneLast5: true,
        source: true,
        createdAt: true,
        _count: { select: { cases: true } },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const canCreate = ["ADMIN", "RECEPTION"].includes(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hồ sơ khách hàng"
        description={`${total} hồ sơ khách. Mỗi khách gồm thông tin + toàn bộ hồ sơ điều trị.`}
        icon={<FolderHeart className="h-5 w-5" />}
        actions={
          <div className="flex items-center gap-2">
            {userCan(user, "mod:ho-so") && (
              <Link href="/ho-so" className={buttonVariants({ variant: "secondary" })}>
                <Stethoscope className="h-4 w-4" /> Tất cả hồ sơ điều trị
              </Link>
            )}
            {canCreate && <NewCustomerButton />}
          </div>
        }
      />

      <Card>
        <div className="border-b border-slate-100 px-4 py-3">
          <form action="/khach-hang" className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                name="q"
                defaultValue={q}
                placeholder="Tìm theo tên hoặc 5 số cuối điện thoại…"
                className="h-10 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              />
            </div>
            <button className={buttonVariants({ variant: "secondary" })}>Tìm</button>
            {q && (
              <Link href="/khach-hang" className={buttonVariants({ variant: "ghost", size: "sm" })}>
                Xóa lọc
              </Link>
            )}
          </form>
        </div>

        <CardContent className="pt-0">
          {customers.length === 0 ? (
            <EmptyState icon={<Users className="h-6 w-6" />} title="Không có khách hàng phù hợp" description="Thử từ khóa khác hoặc lập hồ sơ mới." />
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Khách hàng</TH>
                  <TH>Mã</TH>
                  <TH>Điện thoại</TH>
                  <TH>Giới tính</TH>
                  <TH>Nguồn</TH>
                  <TH className="text-center">Lượt khám</TH>
                  <TH>Ngày tạo</TH>
                </TR>
              </THead>
              <tbody>
                {customers.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/khach-hang/${c.id}`} className="flex items-center gap-2.5">
                        <Avatar name={c.fullName} className="h-8 w-8" />
                        <span className="font-medium text-slate-800 hover:text-brand-600">{c.fullName}</span>
                      </Link>
                    </TD>
                    <TD>
                      <Badge tone="slate">{c.code}</Badge>
                    </TD>
                    <TD className="font-mono text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3 text-brand-400" /> {maskPhone(c.phoneLast5)}
                      </span>
                    </TD>
                    <TD className="text-slate-600">{c.gender ? GENDER_LABEL[c.gender] : "—"}</TD>
                    <TD className="text-slate-600">{SOURCE_LABEL[c.source]}</TD>
                    <TD className="text-center font-medium text-slate-700">{c._count.cases}</TD>
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
