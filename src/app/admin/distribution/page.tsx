"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deliveriesApi, ordersApi, warehousesApi } from "@/lib/api";
import type { DeliverySummary, OrderSummary, Warehouse } from "@/lib/api";

function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function orderStatusVariant(status: string): "default" | "secondary" | "outline" | "destructive" {
  switch (status) {
    case "Fulfilled":
      return "default";
    case "Confirmed":
      return "secondary";
    case "Cancelled":
      return "destructive";
    default:
      return "outline";
  }
}

/**
 * UIRB-FE-A5. Orders list, unscoped (no farmerId) — cross-farmer by design,
 * this is the admin distribution view. "Schedule delivery" links to
 * `/admin/distribution/schedule`, which reuses the same
 * `POST /api/deliveries` endpoint the Farmer wave's Register Delivery screen
 * uses (see that page's doc comment for the confirmed live-endpoint
 * investigation: there is no separate "allocate" action — a delivery IS the
 * allocation, cascading crates to Reserved on creation).
 */
export default function AdminDistributionPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const [todayDeliveries, setTodayDeliveries] = useState<DeliverySummary[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [parishLoading, setParishLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    ordersApi
      .list(undefined, controller.signal)
      .then(setOrders)
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      deliveriesApi.list({ thisWeek: true }, controller.signal),
      warehousesApi.list(undefined, controller.signal),
    ])
      .then(([deliveries, wh]) => {
        if (controller.signal.aborted) return;
        setTodayDeliveries(deliveries.filter((d) => isToday(d.departureTime)));
        setWarehouses(wh);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setParishLoading(false);
      });
    return () => controller.abort();
  }, []);

  const parishSummary = useMemo(() => {
    const parishByWarehouseId = new Map(warehouses.map((w) => [w.id, w.parish]));
    const totals = new Map<string, { packages: number; deliveries: number }>();
    for (const delivery of todayDeliveries) {
      const parish = parishByWarehouseId.get(delivery.warehouseId) ?? "Unknown";
      const existing = totals.get(parish) ?? { packages: 0, deliveries: 0 };
      existing.packages += delivery.crateCount;
      existing.deliveries += 1;
      totals.set(parish, existing);
    }
    return Array.from(totals.entries())
      .map(([parish, v]) => ({ parish, ...v }))
      .sort((a, b) => b.packages - a.packages);
  }, [todayDeliveries, warehouses]);

  const totalPackagesToday = parishSummary.reduce((sum, p) => sum + p.packages, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Today&apos;s distribution, by parish</CardTitle>
          <CardDescription>
            {totalPackagesToday} package{totalPackagesToday === 1 ? "" : "s"} scheduled to move today, across{" "}
            {parishSummary.length} parish{parishSummary.length === 1 ? "" : "es"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {parishLoading && parishSummary.length === 0 ? (
            <div className="flex gap-3">
              <Skeleton className="h-20 w-36" />
              <Skeleton className="h-20 w-36" />
              <Skeleton className="h-20 w-36" />
            </div>
          ) : parishSummary.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">No deliveries departing today.</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {parishSummary.map((p) => (
                <div key={p.parish} className="min-w-36 rounded-lg border p-3">
                  <div className="text-2xl font-semibold tracking-tight">{p.packages}</div>
                  <div className="text-sm font-medium">{p.parish}</div>
                  <div className="text-xs text-muted-foreground">
                    {p.deliveries} {p.deliveries === 1 ? "delivery" : "deliveries"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Distribution</CardTitle>
            <CardDescription>Every order, across every farmer.</CardDescription>
          </div>
          <Button nativeButton={false} render={<Link href="/admin/distribution/schedule" />}>Schedule delivery</Button>
        </CardHeader>
        <CardContent>
          {loading && orders.length === 0 ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order date</TableHead>
                  <TableHead>Buyer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total weight</TableHead>
                  <TableHead>Delivery date</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>{order.buyerName}</TableCell>
                    <TableCell>
                      <Badge variant={orderStatusVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell>{order.totalWeight}kg</TableCell>
                    <TableCell>
                      {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—"}
                    </TableCell>
                    <TableCell>
                      {(order.status === "Pending" || order.status === "Confirmed") && (
                        <Link
                          href={`/admin/distribution/schedule?orderId=${order.id}`}
                          className="text-primary underline-offset-4 hover:underline"
                        >
                          Schedule →
                        </Link>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
