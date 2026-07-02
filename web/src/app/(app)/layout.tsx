import { ShieldAlert } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { navForUser } from "@/lib/permissions";
import { securityWarnings } from "@/lib/security-status";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = navForUser(user).map((n) => ({ href: n.href, label: n.label, icon: n.icon, group: n.group }));
  // Cảnh báo bảo mật chỉ hiện cho ADMIN (người có thể xử lý).
  const warnings = user.role === "ADMIN" ? securityWarnings() : [];

  return (
    <AppShell
      user={{ fullName: user.fullName, roleLabel: ROLE_LABELS[user.role], username: user.username, avatarUrl: user.avatarUrl }}
      nav={nav}
    >
      {warnings.length > 0 && (
        <div className="mb-4 space-y-2">
          {warnings.map((w) => (
            <div key={w.key} className="flex items-start gap-3 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm">
              <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" />
              <div>
                <p className="font-semibold text-rose-700">{w.title}</p>
                <p className="text-rose-600/90">{w.detail}</p>
              </div>
            </div>
          ))}
        </div>
      )}
      {children}
    </AppShell>
  );
}
