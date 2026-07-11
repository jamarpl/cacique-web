"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ordersApi } from "@/lib/api";
import type { OrderSummary } from "@/lib/api";

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

  return (
    <div className="space-y-6">
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
