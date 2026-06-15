import { requireUser } from "@/lib/auth";
import { navForRole, ROLE_LABELS } from "@/lib/rbac";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = navForRole(user.role).map((n) => ({ href: n.href, label: n.label, icon: n.icon }));

  return (
    <AppShell
      user={{ fullName: user.fullName, roleLabel: ROLE_LABELS[user.role], username: user.username, avatarUrl: user.avatarUrl }}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
