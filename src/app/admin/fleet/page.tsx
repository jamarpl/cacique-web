"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { driversApi, vehiclesApi, warehousesApi } from "@/lib/api";
import type { Driver, Vehicle, Warehouse } from "@/lib/api";

const EMPTY_DRIVER_FORM = { name: "", phoneNumber: "", licenseNumber: "", homeWarehouseId: "" };
const EMPTY_VEHICLE_FORM = { plateNumber: "", type: "", capacityKg: "", homeWarehouseId: "" };

function groupByParish<T extends { homeWarehouseId: string | null }>(
  items: T[],
  parishByWarehouseId: Map<string, string>,
): [string, T[]][] {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const parish = (item.homeWarehouseId && parishByWarehouseId.get(item.homeWarehouseId)) || "Unassigned";
    const existing = groups.get(parish);
    if (existing) existing.push(item);
    else groups.set(parish, [item]);
  }
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === "Unassigned") return 1;
    if (b === "Unassigned") return -1;
    return a.localeCompare(b);
  });
}

/**
 * UIRB-FE-A6. Drivers and vehicles, list/create. Confirmed live against
 * `Cacique.Api/Controllers/DriversController.cs` and `VehiclesController.cs`
 * (both simple GET/POST, no farmer scoping) — this was flagged
 * "not independently confirmed" at planning time but was in fact already
 * live and in use by the Farmer wave's driver/vehicle pickers.
 */
export default function AdminFleetPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driversLoading, setDriversLoading] = useState(true);
  const [driverOpen, setDriverOpen] = useState(false);
  const [driverForm, setDriverForm] = useState(EMPTY_DRIVER_FORM);
  const [driverSubmitting, setDriverSubmitting] = useState(false);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(true);
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE_FORM);
  const [vehicleSubmitting, setVehicleSubmitting] = useState(false);

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    warehousesApi
      .list(undefined, controller.signal)
      .then(setWarehouses)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  // homeWarehouseId -> parish, for grouping drivers/vehicles below. Falls
  // back to "Unassigned" for drivers/vehicles with no home warehouse set.
  const parishByWarehouseId = useMemo(() => {
    const map = new Map<string, string>();
    for (const w of warehouses) map.set(w.id, w.parish);
    return map;
  }, [warehouses]);

  const driversByParish = useMemo(
    () => groupByParish(drivers, parishByWarehouseId),
    [drivers, parishByWarehouseId],
  );
  const vehiclesByParish = useMemo(
    () => groupByParish(vehicles, parishByWarehouseId),
    [vehicles, parishByWarehouseId],
  );

  function loadDrivers() {
    setDriversLoading(true);
    driversApi.list().then(setDrivers).catch(() => {}).finally(() => setDriversLoading(false));
  }

  function loadVehicles() {
    setVehiclesLoading(true);
    vehiclesApi.list().then(setVehicles).catch(() => {}).finally(() => setVehiclesLoading(false));
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadDrivers();
    loadVehicles();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleDriverSubmit(e: FormEvent) {
    e.preventDefault();
    setDriverSubmitting(true);
    try {
      await driversApi.create({
        name: driverForm.name.trim(),
        phoneNumber: driverForm.phoneNumber.trim(),
        licenseNumber: driverForm.licenseNumber.trim(),
        homeWarehouseId: driverForm.homeWarehouseId || null,
      });
      toast.success("Driver added.");
      setDriverForm(EMPTY_DRIVER_FORM);
      setDriverOpen(false);
      loadDrivers();
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setDriverSubmitting(false);
    }
  }

  async function handleVehicleSubmit(e: FormEvent) {
    e.preventDefault();
    setVehicleSubmitting(true);
    try {
      await vehiclesApi.create({
        plateNumber: vehicleForm.plateNumber.trim(),
        type: vehicleForm.type.trim(),
        capacityKg: vehicleForm.capacityKg.trim() === "" ? null : Number(vehicleForm.capacityKg),
        homeWarehouseId: vehicleForm.homeWarehouseId || null,
      });
      toast.success("Vehicle added.");
      setVehicleForm(EMPTY_VEHICLE_FORM);
      setVehicleOpen(false);
      loadVehicles();
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setVehicleSubmitting(false);
    }
  }

  const canSubmitDriver =
    driverForm.name.trim() !== "" && driverForm.phoneNumber.trim() !== "" && driverForm.licenseNumber.trim() !== "";
  const canSubmitVehicle = vehicleForm.plateNumber.trim() !== "" && vehicleForm.type.trim() !== "";

  return (
    <Tabs defaultValue="drivers">
      <TabsList>
        <TabsTrigger value="drivers">Drivers</TabsTrigger>
        <TabsTrigger value="vehicles">Vehicles</TabsTrigger>
      </TabsList>

      <TabsContent value="drivers">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Drivers</CardTitle>
              <CardDescription>Every registered driver.</CardDescription>
            </div>
            <Dialog open={driverOpen} onOpenChange={setDriverOpen}>
              <DialogTrigger render={<Button>Add driver</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add driver</DialogTitle>
                  <DialogDescription>Registers a new driver.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleDriverSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="driver-name">Name</Label>
                    <Input
                      id="driver-name"
                      value={driverForm.name}
                      onChange={(e) => setDriverForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driver-phone">Phone</Label>
                    <Input
                      id="driver-phone"
                      value={driverForm.phoneNumber}
                      onChange={(e) => setDriverForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driver-license">License number</Label>
                    <Input
                      id="driver-license"
                      value={driverForm.licenseNumber}
                      onChange={(e) => setDriverForm((f) => ({ ...f, licenseNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="driver-warehouse">Home warehouse (optional)</Label>
                    <Select
                      value={driverForm.homeWarehouseId}
                      onValueChange={(v) => setDriverForm((f) => ({ ...f, homeWarehouseId: v ?? "" }))}
                    >
                      <SelectTrigger id="driver-warehouse" className="w-full">
                        <SelectValue placeholder="Not yet assigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} — {w.parish}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={!canSubmitDriver || driverSubmitting}>
                      {driverSubmitting ? "Adding…" : "Add driver"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {driversLoading && drivers.length === 0 ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : drivers.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No drivers yet.</p>
            ) : (
              <div className="space-y-6">
                {driversByParish.map(([parish, parishDrivers]) => (
                  <div key={parish}>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                      {parish} <span className="font-normal">({parishDrivers.length})</span>
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>License number</TableHead>
                          <TableHead>Home warehouse</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parishDrivers.map((d) => (
                          <TableRow key={d.id}>
                            <TableCell className="font-medium">{d.name}</TableCell>
                            <TableCell>{d.phoneNumber}</TableCell>
                            <TableCell>{d.licenseNumber}</TableCell>
                            <TableCell>{d.homeWarehouseName ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="vehicles">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>Vehicles</CardTitle>
              <CardDescription>Every registered vehicle.</CardDescription>
            </div>
            <Dialog open={vehicleOpen} onOpenChange={setVehicleOpen}>
              <DialogTrigger render={<Button>Add vehicle</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add vehicle</DialogTitle>
                  <DialogDescription>Registers a new vehicle.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleVehicleSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-plate">Plate number</Label>
                    <Input
                      id="vehicle-plate"
                      value={vehicleForm.plateNumber}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, plateNumber: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-type">Type</Label>
                    <Input
                      id="vehicle-type"
                      value={vehicleForm.type}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, type: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-capacity">Capacity (kg, optional)</Label>
                    <Input
                      id="vehicle-capacity"
                      type="number"
                      value={vehicleForm.capacityKg}
                      onChange={(e) => setVehicleForm((f) => ({ ...f, capacityKg: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vehicle-warehouse">Home warehouse (optional)</Label>
                    <Select
                      value={vehicleForm.homeWarehouseId}
                      onValueChange={(v) => setVehicleForm((f) => ({ ...f, homeWarehouseId: v ?? "" }))}
                    >
                      <SelectTrigger id="vehicle-warehouse" className="w-full">
                        <SelectValue placeholder="Not yet assigned" />
                      </SelectTrigger>
                      <SelectContent>
                        {warehouses.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} — {w.parish}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={!canSubmitVehicle || vehicleSubmitting}>
                      {vehicleSubmitting ? "Adding…" : "Add vehicle"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {vehiclesLoading && vehicles.length === 0 ? (
              <div className="space-y-2 py-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : vehicles.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">No vehicles yet.</p>
            ) : (
              <div className="space-y-6">
                {vehiclesByParish.map(([parish, parishVehicles]) => (
                  <div key={parish}>
                    <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
                      {parish} <span className="font-normal">({parishVehicles.length})</span>
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Plate number</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Capacity</TableHead>
                          <TableHead>Home warehouse</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {parishVehicles.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.plateNumber}</TableCell>
                            <TableCell>{v.type}</TableCell>
                            <TableCell>{v.capacityKg !== null ? `${v.capacityKg.toLocaleString()} kg` : "—"}</TableCell>
                            <TableCell>{v.homeWarehouseName ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
