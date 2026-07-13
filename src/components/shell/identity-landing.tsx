import { House } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { IdentitySelectorForm } from "./identity-selector-form";

/** Full-page role-selection landing shown at `/` when no identity is selected yet. */
export function IdentityLanding() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar p-6">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-primary/25 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 bottom-0 size-80 rounded-full bg-accent-brand/20 blur-3xl" />

      <div className="relative flex flex-col items-center gap-6">
        <div className="flex items-center gap-2.5 text-sidebar-foreground">
          <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
            <House className="size-5" />
          </span>
          <div className="leading-tight">
            <div className="font-heading text-lg font-semibold tracking-wide">Cacique</div>
            <div className="text-xs text-sidebar-foreground/60">Distribution network coordination</div>
          </div>
        </div>

        <Card className="w-full max-w-md shadow-xl">
          <CardHeader>
            <CardTitle>Welcome back</CardTitle>
            <CardDescription>Choose who you&apos;re acting as to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <IdentitySelectorForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
