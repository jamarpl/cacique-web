"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { deliveriesApi, driversApi, inventoryApi, ordersApi, vehiclesApi } from "@/lib/api";
import type { Driver, InventoryCrate, OrderSummary, Vehicle } from "@/lib/api";

const NONE = "__none__";

/**
 * UIRB-FE-A5. Allocate & schedule delivery, cross-farmer.
 *
 * Live-endpoint investigation (per the task brief, confirmed against
 * `OrdersController.cs`/`DeliveriesController.cs` directly, not plan-file
 * claims): there is no distinct "allocate" action separate from delivery
 * creation. `POST /api/deliveries` IS the allocation step — on creation it
 * validates every crate is currently Received/Stored (not already
 * allocated), derives the pickup warehouse from the selected crates
 * (rejecting a mixed-warehouse selection), and cascades those crates to
 * Reserved. None of this requires a `farmerId`, and neither does the
 * candidate-crate query (`GET /api/inventory/allocatable`) or the order list
 * (`GET /api/orders`) — both support an optional `farmerId` filter for the
 * farmer-facing screen, but omitting it (as this admin screen does) returns
 * the full cross-farmer candidate set, which is exactly the "cross-farmer
 * order-to-delivery assignment" this screen needs. So this screen reuses the
 * exact same `deliveriesApi.create` the Farmer wave's Register Delivery
 * screen uses, just never filtered by farmerId.
 */
export default function AdminScheduleDeliveryPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderIdFilter = searchParams.get("orderId");

  const [crates, setCrates] = useState<InventoryCrate[]>([]);
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedCrateIds, setSelectedCrateIds] = useState<Set<string>>(new Set());
  const [orderId, setOrderId] = useState<string>(orderIdFilter ?? NONE);
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    Promise.all([
      inventoryApi.listAllocatable(undefined, controller.signal),
      ordersApi.list(undefined, controller.signal),
      driversApi.list(controller.signal),
      vehiclesApi.list(controller.signal),
    ])
      .then(([crateData, orderData, driverData, vehicleData]) => {
        if (controller.signal.aborted) return;
        setCrates(crateData);
        setOrders(orderData.filter((o) => o.status === "Pending" || o.status === "Confirmed"));
        setDrivers(driverData);
        setVehicles(vehicleData);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggleCrate(id: string) {
    setSelectedCrateIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const canSubmit = selectedCrateIds.size > 0 && driverId !== "" && vehicleId !== "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await deliveriesApi.create({
        driverId,
        vehicleId,
        departureTime: departureTime ? new Date(departureTime).toISOString() : null,
        crateIds: Array.from(selectedCrateIds),
        orderId: orderId === NONE ? null : orderId,
      });
      toast.success("Delivery scheduled.");
      router.push("/admin/distribution");
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Schedule delivery</CardTitle>
        <CardDescription>
          Cross-farmer: pick any allocatable crates (from any farmer), an optional order to fulfil, and a
          driver/vehicle. The pickup warehouse is derived automatically — all selected crates must currently be
          at the same warehouse.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-9 w-full sm:w-96" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-9 w-32" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Order (optional)</Label>
              <Select value={orderId} onValueChange={(v) => setOrderId(v ?? NONE)}>
                <SelectTrigger className="w-full sm:w-96">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>No order — direct delivery</SelectItem>
                  {orders.map((order) => (
                    <SelectItem key={order.id} value={order.id}>
                      {order.buyerName} — {new Date(order.orderDate).toLocaleDateString()} ({order.itemCount} items)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {orders.length === 0 && (
                <p className="text-xs text-muted-foreground">No pending/confirmed orders to attach.</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Crates ({selectedCrateIds.size} selected)</Label>
              {crates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No allocatable crates (Received/Stored) available right now.
                </p>
              ) : (
                <div className="max-h-72 overflow-y-auto rounded-lg border">
                  {crates.map((crate) => (
                    <label
                      key={crate.id}
                      className="flex cursor-pointer items-center justify-between gap-4 border-b px-3 py-2 text-sm last:border-b-0 hover:bg-muted/50"
                    >
                      <span className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedCrateIds.has(crate.id)}
                          onCheckedChange={() => toggleCrate(crate.id)}
                        />
                        <span>
                          {crate.cropName} · {crate.weight}kg · Grade {crate.grade} · {crate.farmerName}
                        </span>
                      </span>
                      <span className="flex items-center gap-2 text-xs text-muted-foreground">
                        {crate.currentWarehouse}
                        <Badge variant="outline">{crate.currentStatus}</Badge>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="sched-driver">Driver</Label>
                <Select value={driverId} onValueChange={(v) => setDriverId(v ?? "")}>
                  <SelectTrigger id="sched-driver" className="w-full">
                    <SelectValue placeholder="Choose a driver" />
                  </SelectTrigger>
                  <SelectContent>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sched-vehicle">Vehicle</Label>
                <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "")}>
                  <SelectTrigger id="sched-vehicle" className="w-full">
                    <SelectValue placeholder="Choose a vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plateNumber} ({v.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="sched-departure">Departure time (optional)</Label>
                <Input
                  id="sched-departure"
                  type="datetime-local"
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                />
              </div>
            </div>

            <Button type="submit" disabled={!canSubmit || submitting}>
              {submitting ? "Scheduling…" : "Schedule delivery"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
