"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  BarChart3,
  Boxes,
  FlaskConical,
  House,
  LayoutDashboard,
  Menu,
  Navigation,
  PackagePlus,
  Route,
  Sprout,
  Truck,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { IdentityBadge } from "./identity-badge";
import { IdentitySwitcher } from "./identity-switcher";
import { ThemeToggle } from "./theme-toggle";
import type { NavIconName, NavItem } from "./nav-config";
import { useState } from "react";

const NAV_ICONS: Record<NavIconName, LucideIcon> = {
  dashboard: LayoutDashboard,
  intake: PackagePlus,
  inventory: Boxes,
  customers: Users,
  deliveries: Truck,
  transfers: ArrowLeftRight,
  warehouses: Warehouse,
  crops: Sprout,
  farmers: Users,
  distribution: Route,
  fleet: Truck,
  analytics: BarChart3,
  simulation: FlaskConical,
  myRoute: Navigation,
};

interface AppShellProps {
  /** Role label shown next to the wordmark, e.g. "Farmer" or "Admin". */
  roleLabel: string;
  navItems: NavItem[];
  children: React.ReactNode;
}

/**
 * Shared chrome (dark sidebar + header + content area) composed by both the
 * `/admin` and `/farmer` layouts (UIRB-FE-1). Role-specific nav content is
 * passed in, not baked in here.
 */
export function AppShell({ roleLabel, navItems, children }: AppShellProps) {
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2 px-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <House className="size-4.5" />
          </span>
          <div className="leading-tight">
            <div className="font-heading text-sm font-semibold tracking-wide">Cacique</div>
            <div className="text-[11px] text-sidebar-foreground/60">{roleLabel} console</div>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-2">
          {navItems.map((item) => (
            <SidebarLink key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="rounded-lg bg-sidebar-accent/60 px-3 py-2.5 text-[11px] text-sidebar-foreground/70">
            Demo mode — identity is not an auth boundary.
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
          <div className="flex h-16 items-center gap-3 px-4 md:px-6">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileNavOpen(true)}
                aria-label="Open navigation"
              >
                <Menu className="size-5" />
              </Button>
              <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0 text-sidebar-foreground">
                <SheetHeader className="flex-row items-center gap-2 border-b border-sidebar-border">
                  <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                    <House className="size-4.5" />
                  </span>
                  <SheetTitle className="text-sidebar-foreground">
                    Cacique <span className="font-normal text-sidebar-foreground/60">/ {roleLabel}</span>
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 p-3">
                  {navItems.map((item) => (
                    <SidebarLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onClick={() => setMobileNavOpen(false)}
                    />
                  ))}
                </nav>
              </SheetContent>
            </Sheet>

            <Link href="/" className="font-semibold tracking-tight whitespace-nowrap md:hidden">
              Cacique <span className="font-normal text-muted-foreground">/ {roleLabel}</span>
            </Link>

            <div className="ml-auto flex items-center gap-2">
              <IdentityBadge />
              <IdentitySwitcher />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}

function SidebarLink({
  item,
  pathname,
  onClick,
}: {
  item: NavItem;
  pathname: string;
  onClick?: () => void;
}) {
  const isActive = item.href === pathname || (item.href !== "/" && pathname.startsWith(`${item.href}/`));
  const Icon = NAV_ICONS[item.icon];
  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}
