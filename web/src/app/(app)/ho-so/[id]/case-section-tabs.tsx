"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

export type CaseTab = { key: string; label: string; icon: ReactNode; content: ReactNode };

/**
 * Chuyển các khối nội dung hồ sơ (Tư vấn/Dịch vụ/Vật tư/Ảnh/Giấy tờ) từ cuộn dài xếp chồng
 * sang xem từng phần một — đỡ cuộn, dễ định hướng hơn trên trang mở nhiều nhất mỗi ngày.
 * Cột Tài chính/Tái khám bên phải KHÔNG đưa vào đây — giữ nguyên luôn hiện sẵn vì cần xem
 * cùng lúc lúc thao tác dịch vụ/thanh toán.
 */
export function CaseSectionTabs({ tabs, defaultTab }: { tabs: CaseTab[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key ?? "");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div>
      <div
        className="sticky top-16 z-20 -mx-4 overflow-x-auto border-b border-slate-200 bg-white/95 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
        role="tablist"
        aria-label="Các phần của hồ sơ"
      >
        <div className="flex min-w-max items-center gap-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active === t.key}
              onClick={() => setActive(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition",
                active === t.key ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-800",
              )}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>
      <div key={current?.key} className="animate-fade-in pt-4">
        {current?.content}
      </div>
    </div>
  );
}
