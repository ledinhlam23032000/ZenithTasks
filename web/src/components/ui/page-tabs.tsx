"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export type PageTab = { href: string; label: string };

/**
 * Thanh tab chuyển giữa các trang có liên quan đã gộp chung 1 mục menu
 * (vd Báo cáo / Phân tích kinh doanh / Trợ lý AI). Mỗi trang vẫn là route
 * riêng — thanh này chỉ hiển thị điều hướng, không đổi nội dung trang.
 */
export function PageTabs({ tabs }: { tabs: PageTab[] }) {
  const pathname = usePathname();
  if (tabs.length < 2) return null;
  return (
    <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5 text-sm font-medium">
      {tabs.map((t) => {
        const active = pathname === t.href || pathname.startsWith(t.href + "/");
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "rounded-md px-3 py-1.5 transition-colors",
              active ? "bg-white text-brand-700 shadow-sm" : "text-slate-500 hover:text-slate-700",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
