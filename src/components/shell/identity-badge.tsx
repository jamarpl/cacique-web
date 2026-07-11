"use client";

import { Badge } from "@/components/ui/badge";
import { useActingIdentity } from "@/lib/identity/acting-identity-context";

/** Small, always-visible reminder that the acting role/farmer is a UI convenience, not authentication. */
export function IdentityBadge() {
  const { role, farmerName, driverName } = useActingIdentity();

  const label =
    role === "farmer"
      ? `Farmer${farmerName ? `: ${farmerName}` : ""}`
      : role === "admin"
        ? "Admin"
        : role === "driver"
          ? `Driver${driverName ? `: ${driverName}` : ""}`
          : "No identity selected";

  return (
    <Badge variant="secondary" title="Demo mode — no authentication. This is not a security boundary.">
      {label}
    </Badge>
  );
}
