import type { LucideIcon } from "lucide-react";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  hint?: string;
  loading?: boolean;
  /** Signed percent/point delta vs. a prior period. Omit when there's nothing to compare against. */
  trend?: { value: number; label: string; positiveIsGood?: boolean };
}

/**
 * Icon-led KPI tile shared by the admin and farmer dashboards. `trend` is
 * optional — most of this app's stats (this-week completion rate, etc.)
 * have no prior-period baseline from the API to compare against, so callers
 * only pass it where a real delta exists.
 */
export function StatCard({ label, value, icon: Icon, hint, loading, trend }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-2 space-y-0">
        <div>
          <CardDescription>{label}</CardDescription>
          <CardTitle className="mt-1 text-3xl font-semibold tracking-tight">
            {loading ? <Skeleton className="h-9 w-16" /> : value}
          </CardTitle>
        </div>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4.5" />
        </span>
      </CardHeader>
      <CardContent className="flex items-center gap-2 text-xs text-muted-foreground">
        {trend && !loading && <TrendBadge {...trend} />}
        {hint && <span>{hint}</span>}
      </CardContent>
    </Card>
  );
}

function TrendBadge({ value, label, positiveIsGood = true }: NonNullable<StatCardProps["trend"]>) {
  const isFlat = value === 0;
  const isPositive = value > 0;
  const isGood = isFlat ? null : isPositive === positiveIsGood;

  const Icon = isFlat ? Minus : isPositive ? TrendingUp : TrendingDown;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-medium",
        isFlat && "bg-muted text-muted-foreground",
        isGood === true && "bg-good/10 text-good",
        isGood === false && "bg-critical/10 text-critical",
      )}
    >
      <Icon className="size-3" />
      {isPositive && !isFlat ? "+" : ""}
      {value}% {label}
    </span>
  );
}
