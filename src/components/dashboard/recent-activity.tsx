"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, PackagePlus, Truck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import { deliveriesApi, ordersApi } from "@/lib/api";
import type { DeliverySummary, OrderSummary } from "@/lib/api";

interface ActivityEntry {
  id: string;
  time: Date;
  icon: LucideIcon;
  message: string;
}

function relativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}

function buildActivity(orders: OrderSummary[], deliveries: DeliverySummary[]): ActivityEntry[] {
  const entries: ActivityEntry[] = [];

  for (const order of orders) {
    entries.push({
      id: `order-${order.id}`,
      time: new Date(order.orderDate),
      icon: PackagePlus,
      message: `New order from ${order.buyerName} — ${order.itemCount} item${order.itemCount === 1 ? "" : "s"}, ${order.totalWeight.toLocaleString()}kg`,
    });
  }

  for (const delivery of deliveries) {
    const who = delivery.farmers.map((f) => f.farmerName).join(", ") || delivery.warehouseName;

    if (delivery.status === "Delivered" && delivery.arrivalTime) {
      entries.push({
        id: `delivery-arrived-${delivery.id}`,
        time: new Date(delivery.arrivalTime),
        icon: CheckCircle2,
        message: `Delivery arrived — ${delivery.crateCount} crate${delivery.crateCount === 1 ? "" : "s"} from ${who}, driven by ${delivery.driverName}`,
      });
    } else if (delivery.departureTime) {
      entries.push({
        id: `delivery-departed-${delivery.id}`,
        time: new Date(delivery.departureTime),
        icon: Truck,
        message: `${delivery.status === "InTransit" ? "Delivery departed" : "Delivery scheduled"} from ${delivery.warehouseName} — ${delivery.crateCount} crate${delivery.crateCount === 1 ? "" : "s"}, driver ${delivery.driverName}`,
      });
    }
  }

  return entries.sort((a, b) => b.time.getTime() - a.time.getTime());
}

/**
 * Merges the two data sources the admin dashboard already has API coverage
 * for (orders, this-week deliveries) into a single chronological feed —
 * there's no dedicated "activity log" endpoint, so this is a client-side
 * projection rather than a new backend concept.
 */
export function RecentActivity({ limit = 8 }: { limit?: number }) {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [deliveries, setDeliveries] = useState<DeliverySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.all([
      ordersApi.list(undefined, controller.signal),
      deliveriesApi.list({ thisWeek: true }, controller.signal),
    ])
      .then(([o, d]) => {
        if (controller.signal.aborted) return;
        setOrders(o);
        setDeliveries(d);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Couldn't load recent activity.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return controller;
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = load();
    return () => controller.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const entries = useMemo(() => buildActivity(orders, deliveries).slice(0, limit), [orders, deliveries, limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
        <CardDescription>Orders and deliveries, most recent first.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading && entries.length === 0 ? (
          <div className="space-y-3 py-1">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : error && entries.length === 0 ? (
          <ErrorState onRetry={load} />
        ) : entries.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No recent activity.</p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-start gap-3 text-sm">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <entry.icon className="size-3.5" />
                </span>
                <span className="flex-1">{entry.message}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{relativeTime(entry.time)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
