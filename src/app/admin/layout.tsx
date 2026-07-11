import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { ADMIN_NAV_ITEMS } from "@/components/shell/nav-config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard expected="admin">
      <AppShell roleLabel="Admin" navItems={ADMIN_NAV_ITEMS}>
        {children}
      </AppShell>
    </RoleGuard>
  );
}
