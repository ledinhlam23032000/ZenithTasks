import Link from "next/link";
import { Search, UserPlus, UserCheck, ShieldCheck, ArrowRight, Clock, Info } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { isValidLast5, maskPhone } from "@/lib/phone";
import { todayRange } from "@/lib/dates";
import { fmtRelative, fmtTime } from "@/lib/format";
import { GENDER_LABEL, SOURCE_LABEL } from "@/lib/status";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonVariants } from "@/components/ui/button";
import { NewCustomerButton } from "./new-customer";
import { receiveCustomer } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tiếp nhận khách" };

export default async function ReceptionPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(["ADMIN", "RECEPTION", "TELESALE"]);
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const validQuery = isValidLast5(q);

  const matches = validQuery
    ? await prisma.customer.findMany({
        where: { phoneLast5: q },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          code: true,
          fullName: true,
          gender: true,
          phoneLast5: true,
          source: true,
          createdAt: true,
          _count: { select: { cases: true } },
          cases: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
        },
      })
    : [];

  const waiting = await prisma.appointment.findMany({
    where: { scheduledAt: todayRange(), status: { in: ["BOOKED", "CONFIRMED", "ARRIVED"] } },
    orderBy: { scheduledAt: "asc" },
    take: 12,
    include: { customer: { select: { id: true, fullName: true, phoneLast5: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tiếp nhận khách"
        description="Tra cứu khách theo 5 số cuối điện thoại. Nếu chưa có, lập hồ sơ mới và chuyển cho tư vấn — bác sĩ."
        icon={<UserPlus className="h-5 w-5" />}
        actions={<NewCustomerButton />}
      />

      {/* Ô tra cứu 5 số cuối */}
      <Card>
        <CardContent className="py-6">
          <form action="/tiep-nhan" className="mx-auto max-w-xl">
            <label className="mb-2 block text-center text-sm font-medium text-slate-600">
              Nhập 5 số cuối điện thoại của khách để tra cứu hồ sơ
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  name="q"
                  defaultValue={q}
                  inputMode="numeric"
                  maxLength={5}
                  autoFocus
                  placeholder="VD: 12345"
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-lg tracking-widest text-slate-900 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
                />
              </div>
              <button className={buttonVariants({ size: "lg" })}>Tra cứu</button>
            </div>
            <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5" /> Số điện thoại đầy đủ được ẩn 100% theo quy định bảo mật.
            </p>
          </form>
        </CardContent>
      </Card>

      {/* Kết quả tra cứu */}
      {q !== "" && !validQuery && (
        <Card>
          <CardContent className="flex items-center gap-2 py-4 text-sm text-amber-700">
            <Info className="h-4 w-4" /> Vui lòng nhập đúng 5 chữ số cuối của số điện thoại.
          </CardContent>
        </Card>
      )}

      {validQuery && (
        <Card>
          <CardHeader>
            <CardTitle>
              Kết quả cho “{q}” · {matches.length} hồ sơ
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {matches.length === 0 ? (
              <EmptyState
                icon={<UserPlus className="h-6 w-6" />}
                title="Không tìm thấy khách với 5 số cuối này"
                description="Đây có thể là khách mới. Hãy lập hồ sơ và bổ sung thông tin cơ bản."
                action={<NewCustomerButton label="Lập hồ sơ khách mới" />}
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {matches.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4">
                    <Avatar name={c.fullName} className="h-11 w-11 text-sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Link href={`/khach-hang/${c.id}`} className="truncate font-semibold text-slate-800 hover:text-brand-600">
                          {c.fullName}
                        </Link>
                        <Badge tone="slate">{c.code}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {maskPhone(c.phoneLast5)} · {c.gender ? GENDER_LABEL[c.gender] : "—"} · {SOURCE_LABEL[c.source]}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-400">
                        {c._count.cases} lượt ·{" "}
                        {c.cases[0] ? `lần gần nhất ${fmtRelative(c.cases[0].createdAt)}` : "chưa có lượt khám"}
                      </p>
                    </div>
                    <form action={receiveCustomer}>
                      <input type="hidden" name="customerId" value={c.id} />
                      <button className={buttonVariants({ size: "sm" })}>
                        <UserCheck className="h-4 w-4" /> Tiếp nhận
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Khách đang chờ hôm nay */}
      <Card>
        <CardHeader>
          <CardTitle>Khách hẹn hôm nay</CardTitle>
          <Link href="/lich-hen" className="text-sm font-medium text-brand-600 hover:text-brand-700">
            Xem lịch hẹn
          </Link>
        </CardHeader>
        <CardContent className="pt-0">
          {waiting.length === 0 ? (
            <EmptyState icon={<Clock className="h-6 w-6" />} title="Chưa có khách hẹn hôm nay" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {waiting.map((a) => {
                const name = a.customer?.fullName ?? a.guestName ?? "Khách";
                const last5 = a.customer?.phoneLast5 ?? a.phoneLast5;
                return (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-12 text-sm font-semibold text-slate-700">{fmtTime(a.scheduledAt)}</span>
                    <Avatar name={name} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-800">{name}</p>
                      <p className="text-xs text-slate-400">
                        {maskPhone(last5)} {a.serviceInterest ? `· ${a.serviceInterest}` : ""}
                      </p>
                    </div>
                    {a.customer ? (
                      <form action={receiveCustomer}>
                        <input type="hidden" name="customerId" value={a.customer.id} />
                        <input type="hidden" name="serviceInterest" value={a.serviceInterest ?? ""} />
                        <button className={buttonVariants({ size: "sm", variant: "secondary" })}>
                          Tiếp nhận <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    ) : (
                      <Badge tone="amber">Chưa có hồ sơ</Badge>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
