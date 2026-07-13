"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarCheck, PackageCheck, Truck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { WarehouseUtilizationBars } from "@/components/dashboard/warehouse-utilization-bars";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { StatCard } from "@/components/dashboard/stat-card";
import { analyticsApi, deliveriesApi } from "@/lib/api";
import type { DeliverySummary, WarehouseUtilizationEntry } from "@/lib/api";

/**
 * UIRB-FE-A1. System-wide — no `useActingIdentity()`/`farmerId` threading
 * anywhere on this page, deliberately (Admin dashboard content is never
 * farmer-scoped). No "new warehouse" CTA here either; that action lives on
 * `/admin/warehouses` per the requirements doc section 6.
 */
export default function AdminDashboardPage() {
  const [utilization, setUtilization] = useState<WarehouseUtilizationEntry[]>([]);
  const [utilizationLoading, setUtilizationLoading] = useState(true);
  const [utilizationError, setUtilizationError] = useState<string | null>(null);

  const [weekDeliveries, setWeekDeliveries] = useState<DeliverySummary[]>([]);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [deliveriesError, setDeliveriesError] = useState<string | null>(null);

  function loadUtilization() {
    const controller = new AbortController();
    setUtilizationLoading(true);
    setUtilizationError(null);
    analyticsApi
      .getWarehouseUtilization(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setUtilization(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setUtilizationError("Couldn't load warehouse utilization.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setUtilizationLoading(false);
      });
    return controller;
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = loadUtilization();
    return () => controller.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Unscoped (no farmerId) — deliveries made today are derived client-side
  // from the this-week result (no separate `today`-only server filter
  // exists; `thisWeek` is the only pre-built range, per DeliveriesController).
  function loadWeekDeliveries() {
    const controller = new AbortController();
    setDeliveriesLoading(true);
    setDeliveriesError(null);
    deliveriesApi
      .list({ thisWeek: true }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setWeekDeliveries(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setDeliveriesError("Couldn't load this week's deliveries.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setDeliveriesLoading(false);
      });
    return controller;
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = loadWeekDeliveries();
    return () => controller.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const weekTotal = weekDeliveries.length;
  const weekDelivered = useMemo(
    () => weekDeliveries.filter((d) => d.status === "Delivered").length,
    [weekDeliveries],
  );
  const completionRate = weekTotal > 0 ? Math.round((weekDelivered / weekTotal) * 100) : 0;

  const todayCount = useMemo(() => {
    const today = new Date();
    return weekDeliveries.filter((d) => {
      if (!d.departureTime) return false;
      const departed = new Date(d.departureTime);
      return (
        departed.getFullYear() === today.getFullYear() &&
        departed.getMonth() === today.getMonth() &&
        departed.getDate() === today.getDate()
      );
    }).length;
  }, [weekDeliveries]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Operations overview</h1>
        <p className="text-sm text-muted-foreground">System-wide warehouse and delivery activity.</p>
      </div>

      {deliveriesError && weekDeliveries.length === 0 && !deliveriesLoading && (
        <ErrorState onRetry={loadWeekDeliveries} />
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Deliveries today"
          icon={Truck}
          loading={deliveriesLoading && weekDeliveries.length === 0}
          value={todayCount}
          hint="System-wide, by departure time"
        />
        <StatCard
          label="Delivered this week"
          icon={PackageCheck}
          loading={deliveriesLoading && weekDeliveries.length === 0}
          value={weekDelivered}
          hint="Monday-start week, by departure time"
        />
        <StatCard
          label="Weekly completion rate"
          icon={CalendarCheck}
          loading={deliveriesLoading && weekDeliveries.length === 0}
          value={`${completionRate}%`}
          hint={`${weekDelivered} of ${weekTotal} scheduled deliveries, system-wide`}
        />
      </div>

      <RecentActivity />

      <Card>
        <CardHeader>
          <CardTitle>Warehouse distribution</CardTitle>
          <CardDescription>
            Busiest warehouses by stored weight, colored by utilization (light = low, dark = high).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {utilizationLoading && utilization.length === 0 ? (
            <Skeleton className="h-64 w-full" />
          ) : utilizationError && utilization.length === 0 ? (
            <ErrorState onRetry={loadUtilization} />
          ) : (
            <WarehouseUtilizationBars data={utilization} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
