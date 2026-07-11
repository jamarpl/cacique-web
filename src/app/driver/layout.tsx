import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { DRIVER_NAV_ITEMS } from "@/components/shell/nav-config";

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard expected="driver">
      <AppShell roleLabel="Driver" navItems={DRIVER_NAV_ITEMS}>
        {children}
      </AppShell>
    </RoleGuard>
  );
}
