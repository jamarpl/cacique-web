"use client";

import type { ReactNode } from "react";
import { ActingIdentityProvider } from "@/lib/identity/acting-identity-context";
import { Toaster } from "@/components/ui/sonner";

/** Root client-side providers: acting-identity context + the toast host used by the API client's centralized error handling. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ActingIdentityProvider>
      {children}
      <Toaster richColors position="top-right" />
    </ActingIdentityProvider>
  );
}
