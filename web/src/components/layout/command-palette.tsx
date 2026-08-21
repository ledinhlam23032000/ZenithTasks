"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, CornerDownLeft, Compass } from "lucide-react";
import { globalSearch, type SearchResult } from "@/lib/search-actions";
import type { NavItemData } from "./app-shell";
import { getAliasItems, getQuickStartItems } from "@/lib/quick-starts";

type Item = SearchResult;

/** Tìm kiếm toàn cục: Ctrl/Cmd+K mở, gõ để tìm menu + khách hàng + hồ sơ + vật tư. */
export function CommandPalette({ nav, open, onOpenChange }: { nav: NavItemData[]; open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter();
  const setOpen = onOpenChange;
  const [query, setQuery] = useState("");
  const [remote, setRemote] = useState<Item[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    let frame = 0;
    if (open) {
      frame = requestAnimationFrame(() => {
        setQuery("");
        setRemote([]);
        setActive(0);
        inputRef.current?.focus();
      });
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      globalSearch(q).then(setRemote).catch(() => setRemote([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  const quickActions = useMemo<Item[]>(() => getQuickStartItems(nav, query), [nav, query]);
  const aliasMatches = useMemo<Item[]>(() => getAliasItems(nav, query), [nav, query]);

  const navMatches = useMemo<Item[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return nav
      .filter((n) => n.label.toLowerCase().includes(q))
      .map((n) => ({ id: n.href, title: n.label, href: n.href, group: "Điều hướng" }));
  }, [nav, query]);

  const items = useMemo(() => [...quickActions, ...aliasMatches, ...navMatches, ...remote], [quickActions, aliasMatches, navMatches, remote]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setActive(0));
    return () => cancelAnimationFrame(frame);
  }, [items.length]);

  const go = (item: Item) => {
    setOpen(false);
    router.push(item.href);
  };

  if (!open) return null;

  const grouped = items.reduce<Record<string, Item[]>>((acc, it) => {
    (acc[it.group] ??= []).push(it);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-start sm:px-4 sm:pt-[12vh]" onClick={() => setOpen(false)}>
      <div className="animate-fade-in fixed inset-0 bg-slate-900/40 backdrop-blur-sm" aria-hidden />
      <div
        className="animate-slide-up-in relative w-full max-w-lg overflow-hidden rounded-t-[1.75rem] bg-white pb-[env(safe-area-inset-bottom)] shadow-2xl ring-1 ring-slate-200 sm:animate-scale-in sm:rounded-2xl sm:pb-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mt-2 h-1.5 w-12 rounded-full bg-slate-200 sm:hidden" />
        <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-4 sm:py-3">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              if (next.trim().length < 2) setRemote([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, items.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && items[active]) {
                e.preventDefault();
                go(items[active]);
              }
            }}
            placeholder="Tìm khách hàng, hồ sơ, vật tư, menu…"
            className="h-8 w-full bg-transparent text-base text-slate-700 placeholder:text-slate-400 outline-none sm:h-auto sm:text-sm"
          />
          <kbd className="hidden shrink-0 rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
            Esc
          </kbd>
        </div>

        <div className="max-h-[62dvh] overflow-y-auto p-2 sm:max-h-80">
          {query.trim().length < 2 && items.length === 0 ? (
            <p className="flex items-center gap-2 px-3 py-6 text-sm text-slate-400">
              <Compass className="h-4 w-4" /> Gõ tối thiểu 2 ký tự để tìm kiếm.
            </p>
          ) : items.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-slate-400">Không tìm thấy kết quả.</p>
          ) : (
            Object.entries(grouped).map(([group, rows]) => (
              <div key={group} className="mb-1">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{group}</p>
                {rows.map((it) => {
                  const i = items.indexOf(it);
                  return (
                    <button
                      key={`${it.group}-${it.id}`}
                      type="button"
                      onMouseEnter={() => setActive(i)}
                      onClick={() => go(it)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm ${
                        i === active ? "bg-brand-50 text-brand-700" : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{it.title}</span>
                        {it.subtitle && <span className="block truncate text-xs text-slate-400">{it.subtitle}</span>}
                        {(it.status || it.nextAction) && (
                          <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 text-[10px] font-medium">
                            {it.status && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-slate-500">{it.status}</span>}
                            {it.nextAction && <span className="rounded-md bg-brand-50 px-1.5 py-0.5 text-brand-700">Tiếp theo: {it.nextAction}</span>}
                          </span>
                        )}
                      </span>
                      <span className="flex shrink-0 items-center gap-2">
                        {it.entityType && <span className="hidden text-[10px] uppercase tracking-wide text-slate-300 sm:inline">{it.entityType}</span>}
                        {i === active && <CornerDownLeft className="h-3.5 w-3.5 text-brand-400" />}
                      </span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
