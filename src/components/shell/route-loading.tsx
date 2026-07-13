import { Loader2 } from "lucide-react";

/** Full-bleed placeholder shown while identity hydrates or a role redirect is in flight — avoids a flash of blank background. */
export function RouteLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="size-6 animate-spin text-muted-foreground" />
    </div>
  );
}
