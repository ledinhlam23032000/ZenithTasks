import Link from "next/link";
import { ArrowRight, CalendarClock, FolderHeart, MessageCircleHeart, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type NextAction = {
  label: string;
  detail: string;
  href: string;
  icon: "calendar" | "case" | "wallet" | "care";
};

const ICONS = {
  calendar: CalendarClock,
  case: FolderHeart,
  wallet: Wallet,
  care: MessageCircleHeart,
} as const;

/**
 * Presentation-only bridge between Customer 360 and canonical domain routes.
 * Không tải thêm dữ liệu, không mutate và không thay thế Case/Payment source of truth.
 */
export function CustomerNextActions({ actions }: { actions: NextAction[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-brand-500" /> Tác vụ tiếp theo
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {actions.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có tác vụ cần xử lý ngay.</p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {actions.map((action) => {
              const Icon = ICONS[action.icon];
              return (
                <Link
                  key={`${action.icon}-${action.href}`}
                  href={action.href}
                  className="group rounded-xl border border-slate-200 p-3 transition hover:border-brand-300 hover:bg-brand-50/30"
                >
                  <div className="flex items-start justify-between gap-2">
                    <Icon className="h-4 w-4 text-brand-500" />
                    <ArrowRight className="h-3.5 w-3.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-brand-500" />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-slate-800">{action.label}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{action.detail}</p>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
