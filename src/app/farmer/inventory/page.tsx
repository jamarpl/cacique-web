"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useFarmerScopedResource } from "@/lib/api/hooks";
import { cropsApi, inventoryApi, warehousesApi } from "@/lib/api";
import type { CrateStatus, Crop, Warehouse } from "@/lib/api";

const CRATE_STATUSES: CrateStatus[] = [
  "Received",
  "Stored",
  "Reserved",
  "Packed",
  "InTransit",
  "Delivered",
  "Rejected",
  "Disposed",
];

const ALL = "__all__";

/**
 * UIRB-FE-F3. Farmer-scoping: `farmerId` is threaded into every
 * `GET /api/inventory` call via `useFarmerScopedResource` — the status/crop/
 * warehouse filters below narrow within that already-scoped set, they never
 * broaden it.
 */
export default function InventoryPage() {
  const [status, setStatus] = useState<string>(ALL);
  const [cropId, setCropId] = useState<string>(ALL);
  const [warehouseId, setWarehouseId] = useState<string>(ALL);

  const [crops, setCrops] = useState<Crop[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    cropsApi.list(undefined, controller.signal).then(setCrops).catch(() => {});
    warehousesApi.list(undefined, controller.signal).then(setWarehouses).catch(() => {});
    return () => controller.abort();
  }, []);

  const inventory = useFarmerScopedResource((farmerId, signal) =>
    inventoryApi.list(
      {
        farmerId,
        status: status === ALL ? undefined : (status as CrateStatus),
        cropId: cropId === ALL ? undefined : cropId,
        warehouseId: warehouseId === ALL ? undefined : warehouseId,
      },
      signal,
    ),
  );

  // Filters changed after the initial farmer-scoped load — re-run the fetch
  // with the latest closure via the hook's manual refetch trigger.
  useEffect(() => {
    inventory.refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, cropId, warehouseId]);

  const crates = inventory.data ?? [];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>My inventory</CardTitle>
          <CardDescription>Crates you own, across every warehouse.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="inv-status">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v ?? ALL)}>
                <SelectTrigger id="inv-status" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {CRATE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-crop">Crop</Label>
              <Select value={cropId} onValueChange={(v) => setCropId(v ?? ALL)}>
                <SelectTrigger id="inv-crop" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All crops</SelectItem>
                  {crops.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="inv-warehouse">Warehouse</Label>
              <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v ?? ALL)}>
                <SelectTrigger id="inv-warehouse" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All warehouses</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {inventory.loading && crates.length === 0 ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : inventory.error && crates.length === 0 ? (
            <ErrorState onRetry={inventory.refetch} />
          ) : crates.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No crates match these filters.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>QR code</TableHead>
                  <TableHead>Crop</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Weight</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Intake date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {crates.map((crate) => (
                  <TableRow key={crate.id}>
                    <TableCell className="font-mono text-xs">{crate.qrCode}</TableCell>
                    <TableCell>{crate.cropName}</TableCell>
                    <TableCell>{crate.grade}</TableCell>
                    <TableCell>{crate.weight}kg</TableCell>
                    <TableCell>{crate.currentWarehouse}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{crate.currentStatus}</Badge>
                    </TableCell>
                    <TableCell>{new Date(crate.intakeDate).toLocaleDateString()}</TableCell>
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
