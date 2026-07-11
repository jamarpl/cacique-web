export type NavIconName =
  | "dashboard"
  | "intake"
  | "inventory"
  | "customers"
  | "deliveries"
  | "transfers"
  | "warehouses"
  | "crops"
  | "farmers"
  | "distribution"
  | "fleet"
  | "analytics"
  | "simulation"
  | "myRoute";

export interface NavItem {
  label: string;
  href: string;
  icon: NavIconName;
}

/**
 * Stubbed nav link lists per UIRB-FE-3 — the target pages beyond each
 * role's index (`/farmer`, `/admin`) don't exist yet (Wave 1/Wave 2 build
 * them). Linking to them now is intentional per the task brief; they'll
 * 404 until their owning task lands.
 *
 * `icon` is a name, not a component reference — these lists are consumed
 * by server-component layouts and passed as props into the client
 * `AppShell`, and passing a Lucide component (a function) across that
 * boundary isn't serializable. `AppShell` maps the name to a component.
 */
export const FARMER_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/farmer", icon: "dashboard" },
  { label: "Intake", href: "/farmer/intake", icon: "intake" },
  { label: "Inventory", href: "/farmer/inventory", icon: "inventory" },
  { label: "Customers", href: "/farmer/customers", icon: "customers" },
  { label: "Deliveries", href: "/farmer/deliveries", icon: "deliveries" },
  { label: "Transfers", href: "/farmer/transfers", icon: "transfers" },
];

export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "dashboard" },
  { label: "Warehouses", href: "/admin/warehouses", icon: "warehouses" },
  { label: "Crops", href: "/admin/crops", icon: "crops" },
  { label: "Farmers", href: "/admin/farmers", icon: "farmers" },
  { label: "Distribution", href: "/admin/distribution", icon: "distribution" },
  { label: "Fleet", href: "/admin/fleet", icon: "fleet" },
  { label: "Simulation", href: "/admin/simulation", icon: "simulation" },
  { label: "Analytics", href: "/admin/analytics", icon: "analytics" },
];

export const DRIVER_NAV_ITEMS: NavItem[] = [{ label: "My Route", href: "/driver", icon: "myRoute" }];
