"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useActingIdentity, type ActingRole } from "@/lib/identity/acting-identity-context";

/**
 * Redirects to `/` (the role-selection landing) if the acting identity
 * doesn't match the role this route segment expects — e.g. landing
 * directly on /admin with no identity selected yet, or with "farmer"
 * selected. Not a security boundary (see IdentityBadge) — purely a UX
 * guard so a stale/absent selection doesn't show a confusing empty shell.
 */
export function RoleGuard({ expected, children }: { expected: ActingRole; children: ReactNode }) {
  const router = useRouter();
  const { role, isHydrated } = useActingIdentity();

  useEffect(() => {
    if (!isHydrated) return;
    if (role !== expected) {
      router.replace("/");
    }
  }, [role, isHydrated, expected, router]);

  if (!isHydrated || role !== expected) {
    return null;
  }

  return <>{children}</>;
}
