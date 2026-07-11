"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useFarmerScopedResource } from "@/lib/api/hooks";
import { driversApi, inventoryApi, vehiclesApi, warehousesApi, warehouseTransfersApi } from "@/lib/api";
import type { Driver, InventoryCrate, Vehicle, Warehouse, WarehouseTransfer } from "@/lib/api";

const AT_REST_STATUSES = new Set(["Received", "Stored"]);

/**
 * UIRB-FE-F9. Farmer-scoping: the crate picker (used both for logging a new
 * transfer and for viewing history) is sourced from
 * `GET /api/inventory?farmerId=` (own crates only) via
 * `useFarmerScopedResource` — since `GET /api/warehouse-transfers` itself
 * has no `farmerId` filter (it requires `crateId` or `warehouseId`
 * instead), history is always looked up by a specific `crateId` drawn from
 * that already-scoped list, never by an unscoped `warehouseId`, so this
 * screen can never surface another farmer's transfer history.
 */
export default function TransfersPage() {
  const inventory = useFarmerScopedResource((farmerId, signal) =>
    inventoryApi.list({ farmerId }, signal),
  );
  const crates = (inventory.data ?? []).filter((c) => AT_REST_STATUSES.has(c.currentStatus));

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [crateId, setCrateId] = useState("");
  const [toWarehouseId, setToWarehouseId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [history, setHistory] = useState<WarehouseTransfer[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    warehousesApi.list({ status: "Active" }, controller.signal).then(setWarehouses).catch(() => {});
    driversApi.list(controller.signal).then(setDrivers).catch(() => {});
    vehiclesApi.list(controller.signal).then(setVehicles).catch(() => {});
    return () => controller.abort();
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!crateId) {
      setHistory([]);
      return;
    }
    const controller = new AbortController();
    setHistoryLoading(true);
    warehouseTransfersApi
      .list({ crateId }, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setHistory(data);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setHistoryLoading(false);
      });
    return () => controller.abort();
  }, [crateId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const selectedCrate = crates.find((c) => c.id === crateId);
  const canSubmit = crateId !== "" && toWarehouseId !== "" && driverId !== "" && vehicleId !== "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await warehouseTransfersApi.create({
        crateId,
        toWarehouseId,
        driverId,
        vehicleId,
        notes: notes.trim() || null,
      });
      toast.success("Transfer logged.");
      setToWarehouseId("");
      setDriverId("");
      setVehicleId("");
      setNotes("");
      inventory.refetch();
      const refreshed = await warehouseTransfersApi.list({ crateId });
      setHistory(refreshed);
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Log a transfer</CardTitle>
          <CardDescription>Move one of your crates from its current warehouse to another.</CardDescription>
        </CardHeader>
        <CardContent>
          {inventory.loading && crates.length === 0 ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="xfer-crate">Crate</Label>
                <Select value={crateId} onValueChange={(v) => setCrateId(v ?? "")}>
                  <SelectTrigger id="xfer-crate" className="w-full">
                    <SelectValue placeholder="Choose a crate at rest (Received/Stored)" />
                  </SelectTrigger>
                  <SelectContent>
                    {crates.map((c: InventoryCrate) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.qrCode} — {c.cropName}, {c.weight}kg, currently at {c.currentWarehouse}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {crates.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No crates currently at rest (Received/Stored) to transfer.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="xfer-to-warehouse">Destination warehouse</Label>
                <Select value={toWarehouseId} onValueChange={(v) => setToWarehouseId(v ?? "")}>
                  <SelectTrigger id="xfer-to-warehouse" className="w-full">
                    <SelectValue placeholder="Choose a warehouse" />
                  </SelectTrigger>
                  <SelectContent>
                    {warehouses
                      // NOTE: InventoryCrate.currentWarehouse is a warehouse
                      // NAME (not id) — see types.ts's IntakeCrate doc note.
                      // Compare by name to exclude the crate's current
                      // warehouse from the destination picker.
                      .filter((w) => w.name !== selectedCrate?.currentWarehouse)
                      .map((w) => (
                        <SelectItem key={w.id} value={w.id}>
                          {w.name} — {w.parish}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="xfer-driver">Driver</Label>
                <Select value={driverId} onValueChange={(v) => setDriverId(v ?? "")}>
                  <SelectTrigger id="xfer-driver" className="w-full">
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
                <Label htmlFor="xfer-vehicle">Vehicle</Label>
                <Select value={vehicleId} onValueChange={(v) => setVehicleId(v ?? "")}>
                  <SelectTrigger id="xfer-vehicle" className="w-full">
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

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="xfer-notes">Notes (optional)</Label>
                <Textarea id="xfer-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>

              <div className="sm:col-span-2">
                <Button type="submit" disabled={!canSubmit || submitting}>
                  {submitting ? "Logging…" : "Log transfer"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer history</CardTitle>
          <CardDescription>
            {selectedCrate ? `History for crate ${selectedCrate.qrCode}.` : "Select a crate above to see its history."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!crateId ? (
            <p className="py-4 text-sm text-muted-foreground">No crate selected.</p>
          ) : historyLoading && history.length === 0 ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : history.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No transfers recorded for this crate yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Driver</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{new Date(t.timestamp).toLocaleString()}</TableCell>
                    <TableCell>{t.fromWarehouseName}</TableCell>
                    <TableCell>{t.toWarehouseName}</TableCell>
                    <TableCell>{t.driverName}</TableCell>
                    <TableCell>{t.vehiclePlateNumber}</TableCell>
                    <TableCell>{t.notes ?? "—"}</TableCell>
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
