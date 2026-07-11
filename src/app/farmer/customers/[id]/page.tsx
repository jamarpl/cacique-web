"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { buyersApi, ordersApi } from "@/lib/api";
import type { Buyer, OrderSummary } from "@/lib/api";
import { useActingIdentity } from "@/lib/identity/acting-identity-context";

const DAYS_OF_WEEK = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

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
 * UIRB-FE-F5. Farmer-scoping (two independent guards, since
 * `GET /api/buyers/{id}` itself is not farmer-scoped server-side):
 * 1. After fetching the buyer, its `farmerId` is checked against the acting
 *    farmer — a mismatch (or a buyer belonging to nobody currently acting)
 *    renders "not found" instead of the buyer's data.
 * 2. Order history additionally passes both `buyerId` AND `farmerId` to
 *    `GET /api/orders`, which AND-combines them server-side, so even if step
 *    1 were ever bypassed the order list itself could not leak.
 */
export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const buyerId = params.id;
  const { farmerId } = useActingIdentity();

  const [buyer, setBuyer] = useState<Buyer | null>(null);
  const [buyerLoading, setBuyerLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  const [autoModeEnabled, setAutoModeEnabled] = useState(false);
  const [flexibilityDays, setFlexibilityDays] = useState("0");
  const [maxPerWeek, setMaxPerWeek] = useState("");
  const [blackoutDays, setBlackoutDays] = useState<Set<string>>(new Set());
  const [savingPreferences, setSavingPreferences] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!farmerId) return;
    const controller = new AbortController();
    setBuyerLoading(true);
    setNotFound(false);
    buyersApi
      .getById(buyerId, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        if (data.farmerId !== farmerId) {
          setNotFound(true);
          setBuyer(null);
        } else {
          setBuyer(data);
          setAutoModeEnabled(data.autoModeEnabled);
          setFlexibilityDays(String(data.deliveryFlexibilityDays));
          setMaxPerWeek(data.maxDeliveriesPerWeek === null ? "" : String(data.maxDeliveriesPerWeek));
          setBlackoutDays(new Set(data.blackoutWindows.map((w) => w.dayOfWeek)));
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setNotFound(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBuyerLoading(false);
      });
    return () => controller.abort();
  }, [buyerId, farmerId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!farmerId || !buyer) return;
    const controller = new AbortController();
    setOrdersLoading(true);
    ordersApi
      .list({ buyerId, farmerId }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setOrders(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setOrdersLoading(false);
      });
    return () => controller.abort();
  }, [buyerId, farmerId, buyer]);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleBlackoutDay(day: string) {
    setBlackoutDays((current) => {
      const next = new Set(current);
      if (next.has(day)) {
        next.delete(day);
      } else {
        next.add(day);
      }
      return next;
    });
  }

  async function handleSavePreferences() {
    setSavingPreferences(true);
    try {
      const updated = await buyersApi.updatePreferences(buyerId, {
        autoModeEnabled,
        deliveryFlexibilityDays: Number(flexibilityDays) || 0,
        maxDeliveriesPerWeek: maxPerWeek.trim() === "" ? null : Number(maxPerWeek),
        // Full-day blackout only — the Weekly Distribution Engine treats any
        // window on a day as blocking that whole day for scheduling
        // purposes anyway (see WeeklyDistributionEngineService remarks), so
        // a day-level toggle is the right granularity for this UI.
        blackoutWindows: Array.from(blackoutDays).map((dayOfWeek) => ({
          dayOfWeek,
          startTime: null,
          endTime: null,
        })),
      });
      setBuyer(updated);
      toast.success("Delivery preferences saved.");
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setSavingPreferences(false);
    }
  }

  if (buyerLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (notFound || !buyer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Customer not found</CardTitle>
          <CardDescription>
            This customer doesn&apos;t exist, or doesn&apos;t belong to the currently acting farmer.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/farmer/customers" className="text-sm text-primary underline-offset-4 hover:underline">
            ← Back to customers
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>{buyer.businessName}</CardTitle>
            <CardDescription>
              {buyer.contactName} · {buyer.email} · {buyer.phone}
            </CardDescription>
            <p className="text-xs text-muted-foreground">{buyer.address}</p>
          </div>
          <div className="flex gap-2">
            <Button nativeButton={false} render={<Link href={`/farmer/customers/${buyer.id}/orders/new`} />}>New order</Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href={`/farmer/deliveries/new?buyerId=${buyer.id}`} />}
            >
              New delivery
            </Button>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>I&apos;ve Got This™</CardTitle>
          <CardDescription>
            Let the Distribution Engine choose the best delivery day for this customer&apos;s orders instead of
            always honoring the exact requested date. See automode.md for the full pitch.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoModeEnabled}
              onChange={(e) => setAutoModeEnabled(e.target.checked)}
              className="size-4 rounded border-input"
            />
            Enable smart scheduling for this customer
          </label>

          {autoModeEnabled && (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="pref-flexibility">Delivery flexibility (days)</Label>
                  <Input
                    id="pref-flexibility"
                    type="number"
                    min={0}
                    max={6}
                    value={flexibilityDays}
                    onChange={(e) => setFlexibilityDays(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    How many days on either side of the requested date we&apos;re free to shift a delivery.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pref-max-week">Max deliveries per week (optional)</Label>
                  <Input
                    id="pref-max-week"
                    type="number"
                    min={1}
                    max={7}
                    value={maxPerWeek}
                    onChange={(e) => setMaxPerWeek(e.target.value)}
                    placeholder="No limit"
                  />
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll combine orders onto fewer days rather than exceed this.
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Blackout days</Label>
                <div className="flex flex-wrap gap-3">
                  {DAYS_OF_WEEK.map((day) => (
                    <label key={day} className="flex items-center gap-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={blackoutDays.has(day)}
                        onChange={() => toggleBlackoutDay(day)}
                        className="size-4 rounded border-input"
                      />
                      {day}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">No deliveries will be scheduled on checked days.</p>
              </div>
            </>
          )}

          <Button onClick={handleSavePreferences} disabled={savingPreferences}>
            {savingPreferences ? "Saving…" : "Save preferences"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Order history</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading && orders.length === 0 ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : orders.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No orders yet for this customer.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total weight</TableHead>
                  <TableHead>Delivery date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>{new Date(order.orderDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={orderStatusVariant(order.status)}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>{order.itemCount}</TableCell>
                    <TableCell>{order.totalWeight}kg</TableCell>
                    <TableCell>
                      {order.deliveryDate ? new Date(order.deliveryDate).toLocaleDateString() : "—"}
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
