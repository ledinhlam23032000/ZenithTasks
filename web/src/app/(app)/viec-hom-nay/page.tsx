import Link from "next/link";
import {
  ListTodo,
  CalendarClock,
  CalendarCheck,
  Wallet,
  MessageCircleHeart,
  Users,
  Boxes,
  CheckCircle2,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { requireCap } from "@/lib/auth";
import { userCan } from "@/lib/permissions";
import { getWorkqueue } from "@/lib/workqueue";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DebtCollectButton } from "../cong-no/debt-collect-button";
import { FollowUpArriveButton } from "@/components/ui/follow-up-arrive-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Việc cần làm hôm nay" };

const ICONS: Record<string, LucideIcon> = {
  CalendarClock,
  CalendarCheck,
  Wallet,
  MessageCircleHeart,
  Users,
  Boxes,
};

export default async function WorkqueuePage() {
  const user = await requireCap("mod:viec-hom-nay");
  const canCollect = userCan(user, "payment.add");
  const { sections, total } = await getWorkqueue();
  const active = sections.filter((s) => s.count > 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Việc cần làm hôm nay"
        description="Tổng hợp tự động từ dữ liệu: tái khám, hẹn, công nợ, sinh nhật, khách nguội, kho. Bấm từng mục để xử lý."
        icon={<ListTodo className="h-5 w-5" />}
      />

      {total === 0 ? (
        <Card>
          <CardContent className="py-12">
            <EmptyState
              icon={<CheckCircle2 className="h-8 w-8 text-emerald-500" />}
              title="Tuyệt vời! Không có việc tồn đọng"
              description="Hiện chưa có tái khám đến hạn, công nợ quá hạn hay cảnh báo nào cần xử lý."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Dải tóm tắt số lượng theo nhóm */}
          <div className="flex flex-wrap gap-2">
            {active.map((s) => (
              <a
                key={s.key}
                href={`#${s.key}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm shadow-sm transition hover:border-brand-300"
              >
                <span className="font-medium text-slate-700">{s.label}</span>
                <Badge tone={s.tone}>{s.count}</Badge>
              </a>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {active.map((s) => {
              const Icon = ICONS[s.icon] ?? ListTodo;
              return (
                <Card key={s.key} id={s.key} className="scroll-mt-20">
                  <CardHeader>
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-slate-400" /> {s.label}
                        <Badge tone={s.tone}>{s.count}</Badge>
                      </CardTitle>
                      <p className="text-xs text-slate-400">{s.hint}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <ul className="divide-y divide-slate-100">
                      {s.items.map((it) => {
                        // Nhóm công nợ + có quyền thu tiền: cho "Thu nợ" ngay tại đây (giảm nợ hồ sơ,
                        // dòng tự biến mất sau khi tất toán). Tránh phải mở hồ sơ mới thu được.
                        const showCollect = canCollect && !!it.collect;
                        // Nhóm tái khám: cho "Xác nhận đã đến" ngay tại đây (mọi vai trò xem được
                        // trang này đều được phép — xem role list của markFollowUpArrived).
                        const showArrive = !!it.arrive;
                        const info = (
                          <span className="flex items-center justify-between gap-3 py-2.5">
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-slate-800">{it.title}</span>
                              {it.subtitle && <span className="block truncate text-xs text-slate-400">{it.subtitle}</span>}
                            </span>
                            <span className="flex shrink-0 items-center gap-1.5">
                              {it.badge && <Badge tone={s.tone}>{it.badge}</Badge>}
                              {it.href && !showCollect && !showArrive && <ChevronRight className="h-4 w-4 text-slate-300" />}
                            </span>
                          </span>
                        );
                        if (showCollect && it.collect) {
                          return (
                            <li key={it.id} className="flex items-center gap-2">
                              <Link href={it.href ?? `/ho-so/${it.collect.caseId}`} className="min-w-0 flex-1 block rounded-lg px-1 transition hover:bg-slate-50">
                                {info}
                              </Link>
                              <DebtCollectButton
                                caseId={it.collect.caseId}
                                caseCode={it.collect.caseCode}
                                customerName={it.collect.customerName}
                                debt={it.collect.debt}
                              />
                            </li>
                          );
                        }
                        if (showArrive && it.arrive) {
                          return (
                            <li key={it.id} className="flex items-center gap-2">
                              <Link href={it.href ?? `/ho-so/${it.arrive.caseId}`} className="min-w-0 flex-1 block rounded-lg px-1 transition hover:bg-slate-50">
                                {info}
                              </Link>
                              <FollowUpArriveButton id={it.arrive.id} caseId={it.arrive.caseId} />
                            </li>
                          );
                        }
                        return (
                          <li key={it.id}>
                            {it.href ? (
                              <Link href={it.href} className="block rounded-lg px-1 transition hover:bg-slate-50">
                                {info}
                              </Link>
                            ) : (
                              <div className="px-1">{info}</div>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
