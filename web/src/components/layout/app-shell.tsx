"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LogOut,
  KeyRound,
  UserCog,
  ChevronDown,
  LayoutDashboard,
  CalendarClock,
  UserPlus,
  Users,
  FolderHeart,
  MessageCircleHeart,
  TrendingUp,
  CalendarDays,
  CalendarCheck,
  Contact,
  ListChecks,
  Wallet,
  Boxes,
  Coins,
  ScrollText,
  Activity,
  Handshake,
  ListTodo,
  ServerCog,
  Search,
  Sunrise,
  PieChart,
  FileSignature,
  UserSearch,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { logoutAction } from "@/lib/auth-actions";
import { ChangePasswordModal } from "./change-password";
import { CommandPalette } from "./command-palette";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarClock,
  UserPlus,
  Users,
  FolderHeart,
  MessageCircleHeart,
  TrendingUp,
  CalendarDays,
  CalendarCheck,
  Contact,
  ListChecks,
  Wallet,
  Boxes,
  Coins,
  ScrollText,
  Activity,
  Handshake,
  ListTodo,
  ServerCog,
  Sunrise,
  PieChart,
  FileSignature,
  UserSearch,
  Sparkles,
};

export type NavItemData = { href: string; label: string; icon: string; group: string };
export type ShellUser = { fullName: string; roleLabel: string; username: string; avatarUrl?: string | null };

export function AppShell({
  user,
  nav,
  children,
}: {
  user: ShellUser;
  nav: NavItemData[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem("zenith:sidebar-collapsed");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggleGroup = (group: string, defaultOpen: boolean) => {
    setCollapsedGroups((prev) => {
      const currentlyOpen = group in prev ? !prev[group] : defaultOpen;
      const next = { ...prev, [group]: currentlyOpen };
      try {
        localStorage.setItem("zenith:sidebar-collapsed", JSON.stringify(next));
      } catch {
        /* localStorage indisponible */
      }
      return next;
    });
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const navGroups = nav.reduce<Record<string, NavItemData[]>>((groups, item) => {
    (groups[item.group] ??= []).push(item);
    return groups;
  }, {});
  const preferredMobileHrefs = ["/dashboard", "/viec-hom-nay", "/lich-hen", "/tiep-nhan", "/khach-hang"];
  const mobileNav = preferredMobileHrefs
    .map((href) => nav.find((item) => item.href === href))
    .filter((item): item is NavItemData => Boolean(item));
  for (const item of nav) {
    if (mobileNav.length >= 4) break;
    if (!mobileNav.some((current) => current.href === item.href)) mobileNav.push(item);
  }

  const groupEntries = Object.entries(navGroups);

  const navList = (
    <nav className="flex-1 min-h-0 space-y-1 overflow-y-auto px-3 py-4">
      {groupEntries.map(([group, items], groupIndex) => {
        const defaultOpen = groupIndex === 0 || items.some((item) => isActive(item.href));
        const open = group in collapsedGroups ? !collapsedGroups[group] : defaultOpen;
        return (
          <div key={group} className="pb-1">
            <button
              type="button"
              onClick={() => toggleGroup(group, defaultOpen)}
              className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-[10px] font-semibold uppercase text-slate-400 hover:text-slate-600"
              aria-expanded={open}
            >
              {group}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-0" : "-rotate-90")} />
            </button>
            {open && (
              <div className="mt-1 space-y-1">
                {items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px]", active ? "text-brand-600" : "text-slate-400 group-hover:text-slate-600")} />
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="px-5 py-5 leading-snug">
      <p className="text-sm font-bold text-brand-700">Trung tâm Phẫu thuật Tạo hình Thẩm mỹ</p>
      <p className="mt-1 text-[11px] text-slate-400">Bệnh viện Đa khoa Hồng Phúc</p>
    </div>
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Sidebar desktop */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-slate-200 bg-white lg:flex">
        {brand}
        {navList}
        <div className="px-5 py-4 text-[11px] leading-relaxed text-slate-400">
          <p className="font-medium text-slate-500">BVĐK Hồng Phúc</p>
          <p>Thiết kế: BS. Lê Đình Lam (GĐĐH)</p>
          <p>Hỗ trợ sự cố: 0941567496</p>
        </div>
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 flex h-full w-72 flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between pr-3">
              {brand}
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            {navList}
          </aside>
        </div>
      )}

      {/* Cột nội dung */}
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600 sm:ml-2"
            title="Tìm kiếm toàn cục"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Tìm kiếm…</span>
            <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium sm:inline">
              Ctrl+K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2.5 text-left hover:bg-slate-100"
              >
                <Avatar name={user.fullName} src={user.avatarUrl} />
                <span className="hidden leading-tight sm:block">
                  <span className="block text-sm font-medium text-slate-800">{user.fullName}</span>
                  <span className="block text-xs text-slate-400">{user.roleLabel}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-slate-400" />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium text-slate-800">{user.fullName}</p>
                      <p className="text-xs text-slate-400">@{user.username} · {user.roleLabel}</p>
                    </div>
                    <div className="my-1 h-px bg-slate-100" />
                    <Link
                      href="/tai-khoan"
                      onClick={() => setMenuOpen(false)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                    >
                      <UserCog className="h-4 w-4" /> Thông tin cá nhân
                    </Link>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        setPwOpen(true);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                    >
                      <KeyRound className="h-4 w-4" /> Đổi mật khẩu
                    </button>
                    <form action={logoutAction}>
                      <button
                        type="submit"
                        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                      >
                        <LogOut className="h-4 w-4" /> Đăng xuất
                      </button>
                    </form>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 sm:px-6 lg:px-8 lg:py-6">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden"
        style={{ gridTemplateColumns: `repeat(${Math.max(mobileNav.length, 1)}, minmax(0, 1fr))` }}
        aria-label="Truy cập nhanh"
      >
        {mobileNav.slice(0, 4).map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[11px] font-medium",
                active ? "bg-brand-50 text-brand-700" : "text-slate-500",
              )}
            >
              <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-slate-400")} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <CommandPalette nav={nav} open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
