"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useActingIdentity } from "@/lib/identity/acting-identity-context";
import { IdentityLanding } from "@/components/shell/identity-landing";
import { RouteLoading } from "@/components/shell/route-loading";

/**
 * Root route (UIRB-FE-3): redirects to whichever role is currently acting
 * (`/farmer`, `/admin`, or `/driver`), or renders the role-selection landing
 * page if no identity has been chosen yet.
 */
export default function RootPage() {
  const router = useRouter();
  const { role, isHydrated } = useActingIdentity();

  useEffect(() => {
    if (!isHydrated) return;
    if (role === "farmer") router.replace("/farmer");
    else if (role === "admin") router.replace("/admin");
    else if (role === "driver") router.replace("/driver");
  }, [role, isHydrated, router]);

  if (!isHydrated || role === "farmer" || role === "admin" || role === "driver") {
    // Either still reading localStorage, or a redirect above is about to
    // fire — render a loading placeholder rather than a flash of the
    // landing page (or a flash of blank background before it).
    return <RouteLoading />;
  }

  return <IdentityLanding />;
}
