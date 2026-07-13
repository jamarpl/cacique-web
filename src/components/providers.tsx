"use client";

import type { ReactNode } from "react";
import { ActingIdentityProvider } from "@/lib/identity/acting-identity-context";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

/** Root client-side providers: theme + acting-identity context + the toast host used by the API client's centralized error handling. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <ActingIdentityProvider>
        {children}
        <Toaster richColors position="top-right" />
      </ActingIdentityProvider>
    </ThemeProvider>
  );
}
