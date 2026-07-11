import { AppShell } from "@/components/shell/app-shell";
import { RoleGuard } from "@/components/shell/role-guard";
import { FARMER_NAV_ITEMS } from "@/components/shell/nav-config";

export default function FarmerLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard expected="farmer">
      <AppShell roleLabel="Farmer" navItems={FARMER_NAV_ITEMS}>
        {children}
      </AppShell>
    </RoleGuard>
  );
}
