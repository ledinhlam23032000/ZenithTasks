import { requireUser } from "@/lib/auth";
import { ROLE_LABELS } from "@/lib/rbac";
import { navForUser } from "@/lib/permissions";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const nav = navForUser(user).map((n) => ({ href: n.href, label: n.label, icon: n.icon }));

  return (
    <AppShell
      user={{ fullName: user.fullName, roleLabel: ROLE_LABELS[user.role], username: user.username, avatarUrl: user.avatarUrl }}
      nav={nav}
    >
      {children}
    </AppShell>
  );
}
