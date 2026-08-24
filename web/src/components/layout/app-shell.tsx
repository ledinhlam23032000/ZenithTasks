"use client";

import { useEffect, useRef, useState } from "react";
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
  FolderKanban,
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
  Building2,
  ListTree,
  Calculator,
  Inbox,
  Plug,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "@/components/ui/avatar";
import { InstallAppButton } from "@/components/install-app";
import { logoutAction } from "@/lib/auth-actions";
import { ChangePasswordModal } from "./change-password";
import { CommandPalette } from "./command-palette";
import { RouteProgress } from "./route-progress";
import { PushNotificationButton } from "@/components/push-notification-button";
import type { Role } from "@/generated/prisma/client";

const ICONS: Record<string, LucideIcon> = {
  LayoutDashboard,
  CalendarClock,
  UserPlus,
  Users,
  FolderHeart,
  FolderKanban,
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
  Building2,
  ListTree,
  Calculator,
  Inbox,
  Plug,
};

export type NavItemData = { href: string; label: string; icon: string; group: string };
export type ShellUser = { fullName: string; role: Role; roleLabel: string; username: string; avatarUrl?: string | null };
export type WorkloadSummary = { total: number; followUps: number; appointments: number; newCustomers: number; debts: number };

type RouteAlias = { prefix: string; label: string; parentHref: string; parentLabel: string };

const ROUTE_ALIASES: readonly RouteAlias[] = [
  { prefix: "/ke-toan/de-nghi-thanh-toan", label: "Đề nghị thanh toán", parentHref: "/ke-toan", parentLabel: "Kế toán" },
  { prefix: "/cham-soc/hop-thu", label: "Hộp thư CSKH", parentHref: "/cham-soc", parentLabel: "Chăm sóc KH" },
  { prefix: "/ho-so", label: "Hồ sơ điều trị", parentHref: "/khach-hang", parentLabel: "Hồ sơ khách hàng" },
  { prefix: "/lich-hen", label: "Lịch hẹn / tái khám", parentHref: "/lich-hen", parentLabel: "Lịch hẹn" },
];

export function AppShell({
  user,
  nav,
  children,
  pushPublicKey,
  workload,
}: {
  user: ShellUser;
  nav: NavItemData[];
  children: React.ReactNode;
  pushPublicKey: string;
  workload: WorkloadSummary;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
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

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

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

  const isActive = (href: string) => {
    if (href === "/he-thong") {
      return pathname === "/he-thong" || pathname.startsWith("/he-thong/") || pathname === "/nhat-ky" || pathname.startsWith("/nhat-ky/") || pathname === "/cham-soc/ket-noi" || pathname.startsWith("/cham-soc/ket-noi/");
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const navGroups = nav.reduce<Record<string, NavItemData[]>>((groups, item) => {
    (groups[item.group] ??= []).push(item);
    return groups;
  }, {});
  // Trợ lý AI đứng ngay thanh đáy nếu tài khoản có quyền (đặc biệt cho Cổ đông).
  const preferredMobileHrefs =
    workload.total > 0 && nav.some((item) => item.href === "/viec-hom-nay")
      ? ["/viec-hom-nay", "/lich-hen", "/khach-hang", "/dashboard"]
      : user.role === "RECEPTION" || user.role === "TELESALE"
        ? ["/dau-ca", "/tiep-nhan", "/lich-hen", "/viec-hom-nay"]
        : user.role === "DOCTOR" || user.role === "CONSULTANT"
          ? ["/viec-hom-nay", "/lich-hen", "/ho-so", "/khach-hang"]
          : user.role === "CARE"
            ? ["/viec-hom-nay", "/cham-soc", "/cham-soc/hop-thu", "/khach-hang"]
            : ["/dashboard", "/tro-ly", "/viec-hom-nay", "/lich-hen"];
  const mobileNav = preferredMobileHrefs
    .map((href) => nav.find((item) => item.href === href))
    .filter((item): item is NavItemData => Boolean(item));
  for (const item of nav) {
    if (mobileNav.length >= 3) break;
    if (!mobileNav.some((current) => current.href === item.href)) mobileNav.push(item);
  }

  const groupEntries = Object.entries(navGroups);
  const directActiveNav = [...nav].sort((a, b) => b.href.length - a.href.length).find((item) => isActive(item.href));
  const activeAlias = ROUTE_ALIASES.find((alias) => pathname === alias.prefix || pathname.startsWith(`${alias.prefix}/`));
  const aliasParentAllowed = activeAlias ? nav.some((item) => item.href === activeAlias.parentHref) : false;
  const activeNav = directActiveNav ?? (activeAlias && aliasParentAllowed ? {
    href: activeAlias.prefix,
    label: activeAlias.label,
    icon: "Compass",
    group: "Khách hàng",
  } : undefined);

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
      <RouteProgress />
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

      {/* Kho ứng dụng mobile: mọi chức năng vẫn nằm trong tầm ngón tay cái. */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex items-end lg:hidden" role="dialog" aria-modal="true" aria-label="Tất cả chức năng">
          <button className="animate-fade-in absolute inset-0 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMobileOpen(false)} aria-label="Đóng menu" />
          <section className="animate-slide-up-in relative flex max-h-[92dvh] w-full flex-col rounded-t-[1.75rem] bg-slate-50 shadow-2xl">
            <div className="shrink-0 rounded-t-[1.75rem] border-b border-slate-200 bg-white px-4 pb-3 pt-2">
              <div className="mx-auto mb-2 h-1.5 w-12 rounded-full bg-slate-200" />
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg shadow-brand-200">
                  <LayoutDashboard className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="font-semibold text-slate-900">Tất cả chức năng</h2>
                  <p className="truncate text-xs text-slate-500">{user.fullName} · {user.roleLabel}</p>
                </div>
                <button onClick={() => setMobileOpen(false)} className="rounded-full bg-slate-100 p-2.5 text-slate-500 active:bg-slate-200" aria-label="Đóng">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setSearchOpen(true);
                }}
                className="mb-4 flex min-h-12 w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-left text-sm text-slate-400 shadow-sm"
              >
                <Search className="h-4.5 w-4.5" /> Tìm khách hàng, hồ sơ, vật tư…
              </button>

              <div className="space-y-5">
                {groupEntries.map(([group, items]) => (
                  <section key={group}>
                    <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-400">{group}</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {items.map((item) => {
                        const Icon = ICONS[item.icon] ?? LayoutDashboard;
                        const active = isActive(item.href);
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex min-h-[5.6rem] flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-center text-xs font-semibold shadow-sm transition active:scale-[0.98]",
                              active
                                ? "border-brand-200 bg-brand-50 text-brand-700"
                                : "border-slate-200 bg-white text-slate-600",
                            )}
                          >
                            <span className={cn("inline-flex h-10 w-10 items-center justify-center rounded-2xl", active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-500")}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="line-clamp-2 leading-tight">{item.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-5">
                <InstallAppButton />
              </div>
            </div>
          </section>
        </div>
      )}

      {/* Cột nội dung */}
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="mobile-safe-top sticky top-0 z-30 flex min-h-16 items-center justify-between gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur-xl sm:h-16 sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200 lg:hidden"
            aria-label="Mở menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1 sm:hidden">
            <p className="truncate text-sm font-semibold text-slate-900">{activeNav?.label ?? "Ứng dụng quản trị"}</p>
            <p className="truncate text-[10px] font-medium text-brand-600">BVĐK Hồng Phúc</p>
          </div>

          <button
            onClick={() => setSearchOpen(true)}
            className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-1.5 text-sm text-slate-400 hover:border-slate-300 hover:text-slate-600 sm:ml-2 sm:flex"
            title="Tìm kiếm toàn cục"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Tìm kiếm…</span>
            <kbd className="hidden rounded-md border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium sm:inline">
              Ctrl+K
            </kbd>
          </button>

          <div className="ml-auto flex items-center gap-2">
            <PushNotificationButton publicKey={pushPublicKey} />
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                className="flex min-h-10 items-center gap-2.5 rounded-xl p-1 text-left hover:bg-slate-100 sm:py-1.5 sm:pl-1.5 sm:pr-2.5"
              >
                <Avatar name={user.fullName} src={user.avatarUrl} />
                <span className="hidden leading-tight sm:block">
                  <span className="block text-sm font-medium text-slate-800">{user.fullName}</span>
                  <span className="block text-xs text-slate-400">{user.roleLabel}</span>
                </span>
                <ChevronDown className="hidden h-4 w-4 text-slate-400 sm:block" />
              </button>

              {menuOpen && (
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
              )}
            </div>
          </div>
        </header>

        <main className="mobile-content mx-auto w-full max-w-7xl flex-1 px-3 pb-28 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:py-6">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-slate-200 bg-white/95 px-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-xl lg:hidden"
        aria-label="Truy cập nhanh"
      >
        {mobileNav.slice(0, 3).map((item) => {
          const Icon = ICONS[item.icon] ?? LayoutDashboard;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-h-[3.4rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold active:bg-slate-100",
                active ? "text-brand-700" : "text-slate-500",
              )}
            >
              <span className={cn("inline-flex h-7 min-w-10 items-center justify-center rounded-full", active && "bg-brand-100")}>
                <Icon className={cn("h-5 w-5", active ? "text-brand-600" : "text-slate-400")} />
              </span>
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="flex min-h-[3.4rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold text-slate-500 active:bg-slate-100"
        >
          <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-full"><Search className="h-5 w-5 text-slate-400" /></span>
          Tìm kiếm
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex min-h-[3.4rem] flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[10px] font-semibold text-slate-500 active:bg-slate-100"
        >
          <span className="inline-flex h-7 min-w-10 items-center justify-center rounded-full"><Menu className="h-5 w-5 text-slate-400" /></span>
          Tất cả
        </button>
      </nav>

      <ChangePasswordModal open={pwOpen} onClose={() => setPwOpen(false)} />
      <CommandPalette nav={nav} open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
