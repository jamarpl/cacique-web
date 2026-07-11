"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, CalendarCheck, Clock3, PackageCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/dashboard/stat-card";
import { useFarmerScopedResource } from "@/lib/api/hooks";
import { deliveriesApi } from "@/lib/api";

const PENDING_STATUSES = new Set(["Scheduled", "InTransit"]);

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function statusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Delivered":
      return "default";
    case "InTransit":
      return "secondary";
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * UIRB-FE-F1. Farmer-scoping: both delivery fetches pass `farmerId` (from
 * `useFarmerScopedResource`, which resolves it from the acting identity and
 * never fires without one) to `GET /api/deliveries`, so every stat and the
 * activity feed below are already scoped server-side — no client-side
 * cross-farmer filtering is needed or performed.
 */
export default function FarmerDashboardPage() {
  const allDeliveries = useFarmerScopedResource((farmerId, signal) => deliveriesApi.list({ farmerId }, signal));
  const weekDeliveries = useFarmerScopedResource((farmerId, signal) =>
    deliveriesApi.list({ farmerId, thisWeek: true }, signal),
  );

  const pendingCount = useMemo(
    () => (allDeliveries.data ?? []).filter((d) => PENDING_STATUSES.has(d.status)).length,
    [allDeliveries.data],
  );

  const weekTotal = weekDeliveries.data?.length ?? 0;
  const weekDelivered = useMemo(
    () => (weekDeliveries.data ?? []).filter((d) => d.status === "Delivered").length,
    [weekDeliveries.data],
  );
  const completionRate = weekTotal > 0 ? Math.round((weekDelivered / weekTotal) * 100) : 0;

  const recent = (allDeliveries.data ?? []).slice(0, 8);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Farm overview</h1>
        <p className="text-sm text-muted-foreground">Your deliveries and pending shipments at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pending deliveries"
          icon={Clock3}
          loading={allDeliveries.loading && allDeliveries.data === undefined}
          value={pendingCount}
          hint="Scheduled + in transit"
        />
        <StatCard
          label="Delivered this week"
          icon={PackageCheck}
          loading={weekDeliveries.loading && weekDeliveries.data === undefined}
          value={weekDelivered}
          hint="Monday-start week, by departure time"
        />
        <StatCard
          label="Weekly completion rate"
          icon={CalendarCheck}
          loading={weekDeliveries.loading && weekDeliveries.data === undefined}
          value={`${completionRate}%`}
          hint={`${weekDelivered} of ${weekTotal} scheduled deliveries`}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Your most recent deliveries, newest first.</CardDescription>
        </CardHeader>
        <CardContent>
          {allDeliveries.loading && recent.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : recent.length === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries yet.</p>
          ) : (
            <ul className="divide-y">
              {recent.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div>
                    <div className="font-medium">{d.warehouseName}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.driverName} · {d.vehiclePlateNumber} · {d.crateCount} crate{d.crateCount === 1 ? "" : "s"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">{formatDateTime(d.departureTime)}</span>
                    <Badge variant={statusVariant(d.status)}>{d.status}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Link
        href="/farmer/deliveries"
        className="inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        View all deliveries <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}
