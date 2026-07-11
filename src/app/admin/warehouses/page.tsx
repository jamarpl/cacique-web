"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WarehouseCapacityHealth } from "@/components/dashboard/warehouse-capacity-health";
import { analyticsApi, cropsApi, warehousesApi } from "@/lib/api";
import type { Crop, Warehouse, WarehouseCrop, WarehouseUtilizationEntry } from "@/lib/api";

interface WarehouseFormState {
  name: string;
  parish: string;
  address: string;
  capacity: string;
}

const EMPTY_FORM: WarehouseFormState = { name: "", parish: "", address: "", capacity: "" };

/**
 * UIRB-FE-A2. System-wide (no farmer scoping applies to warehouses at all —
 * there is no farmerId concept on this resource). "Add warehouse" lives
 * here, not on `/admin` (per the requirements doc section 6).
 */
export default function AdminWarehousesPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [crops, setCrops] = useState<Crop[]>([]);

  const [utilization, setUtilization] = useState<WarehouseUtilizationEntry[]>([]);
  const [utilizationLoading, setUtilizationLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<WarehouseFormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [editTarget, setEditTarget] = useState<Warehouse | null>(null);
  const [editForm, setEditForm] = useState<WarehouseFormState>(EMPTY_FORM);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const [cropsTarget, setCropsTarget] = useState<Warehouse | null>(null);
  const [cropsSelection, setCropsSelection] = useState<Set<string>>(new Set());
  const [cropsLoading, setCropsLoading] = useState(false);
  const [cropsSubmitting, setCropsSubmitting] = useState(false);

  function loadWarehouses() {
    setLoading(true);
    warehousesApi
      .list()
      .then(setWarehouses)
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    loadWarehouses();
    const controller = new AbortController();
    cropsApi.list(undefined, controller.signal).then(setCrops).catch(() => {});
    analyticsApi
      .getWarehouseUtilization(controller.signal)
      .then(setUtilization)
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setUtilizationLoading(false);
      });
    return () => controller.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await warehousesApi.create({
        name: createForm.name.trim(),
        parish: createForm.parish.trim(),
        address: createForm.address.trim(),
        capacity: Number(createForm.capacity),
      });
      toast.success("Warehouse created.");
      setCreateForm(EMPTY_FORM);
      setCreateOpen(false);
      loadWarehouses();
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setSubmitting(false);
    }
  }

  function openEdit(warehouse: Warehouse) {
    setEditTarget(warehouse);
    setEditForm({
      name: warehouse.name,
      parish: warehouse.parish,
      address: warehouse.address,
      capacity: String(warehouse.capacity),
    });
  }

  async function handleEdit(e: FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSubmitting(true);
    try {
      await warehousesApi.update(editTarget.id, {
        name: editForm.name.trim(),
        parish: editForm.parish.trim(),
        address: editForm.address.trim(),
        capacity: Number(editForm.capacity),
      });
      toast.success("Warehouse updated.");
      setEditTarget(null);
      loadWarehouses();
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setEditSubmitting(false);
    }
  }

  async function toggleStatus(warehouse: Warehouse) {
    const nextStatus = warehouse.status === "Active" ? "Inactive" : "Active";
    try {
      await warehousesApi.updateStatus(warehouse.id, { status: nextStatus });
      toast.success(`Warehouse marked ${nextStatus.toLowerCase()}.`);
      loadWarehouses();
    } catch {
      // Error toast already surfaced by the API client.
    }
  }

  function openCrops(warehouse: Warehouse) {
    setCropsTarget(warehouse);
    setCropsLoading(true);
    warehousesApi
      .getCrops(warehouse.id)
      .then((assigned: WarehouseCrop[]) => setCropsSelection(new Set(assigned.map((c) => c.id))))
      .catch(() => {})
      .finally(() => setCropsLoading(false));
  }

  function toggleCropSelection(cropId: string) {
    setCropsSelection((prev) => {
      const next = new Set(prev);
      if (next.has(cropId)) next.delete(cropId);
      else next.add(cropId);
      return next;
    });
  }

  async function saveCrops() {
    if (!cropsTarget) return;
    setCropsSubmitting(true);
    try {
      await warehousesApi.updateCrops(cropsTarget.id, { cropIds: Array.from(cropsSelection) });
      toast.success("Crop capabilities updated.");
      setCropsTarget(null);
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setCropsSubmitting(false);
    }
  }

  const canCreate =
    createForm.name.trim() !== "" &&
    createForm.parish.trim() !== "" &&
    createForm.address.trim() !== "" &&
    createForm.capacity.trim() !== "" &&
    !Number.isNaN(Number(createForm.capacity));

  const canEdit =
    editForm.name.trim() !== "" &&
    editForm.parish.trim() !== "" &&
    editForm.address.trim() !== "" &&
    editForm.capacity.trim() !== "" &&
    !Number.isNaN(Number(editForm.capacity));

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Capacity health</CardTitle>
          <CardDescription>Current stored weight vs. capacity, every warehouse.</CardDescription>
        </CardHeader>
        <CardContent>
          {utilizationLoading && utilization.length === 0 ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <WarehouseCapacityHealth data={utilization} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Warehouses</CardTitle>
            <CardDescription>All warehouses across every parish.</CardDescription>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger render={<Button>Add warehouse</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add warehouse</DialogTitle>
                <DialogDescription>Registers a new warehouse.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="wh-name">Name</Label>
                  <Input
                    id="wh-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-parish">Parish</Label>
                  <Input
                    id="wh-parish"
                    value={createForm.parish}
                    onChange={(e) => setCreateForm((f) => ({ ...f, parish: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-address">Address</Label>
                  <Input
                    id="wh-address"
                    value={createForm.address}
                    onChange={(e) => setCreateForm((f) => ({ ...f, address: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="wh-capacity">Capacity (kg)</Label>
                  <Input
                    id="wh-capacity"
                    type="number"
                    value={createForm.capacity}
                    onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={!canCreate || submitting}>
                    {submitting ? "Creating…" : "Create warehouse"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {loading && warehouses.length === 0 ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : warehouses.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No warehouses yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Parish</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {warehouses.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-medium">{w.name}</TableCell>
                    <TableCell>{w.parish}</TableCell>
                    <TableCell>{w.address}</TableCell>
                    <TableCell>{w.capacity.toLocaleString()} kg</TableCell>
                    <TableCell>
                      <Badge variant={w.status === "Active" ? "default" : "outline"}>{w.status}</Badge>
                    </TableCell>
                    <TableCell className="flex flex-wrap justify-end gap-2">
                      <Button size="sm" variant="outline" onClick={() => openCrops(w)}>
                        Crops
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => openEdit(w)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => toggleStatus(w)}>
                        {w.status === "Active" ? "Deactivate" : "Activate"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={editTarget !== null} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit warehouse</DialogTitle>
            <DialogDescription>{editTarget?.name}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="wh-edit-name">Name</Label>
              <Input
                id="wh-edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-edit-parish">Parish</Label>
              <Input
                id="wh-edit-parish"
                value={editForm.parish}
                onChange={(e) => setEditForm((f) => ({ ...f, parish: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-edit-address">Address</Label>
              <Input
                id="wh-edit-address"
                value={editForm.address}
                onChange={(e) => setEditForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wh-edit-capacity">Capacity (kg)</Label>
              <Input
                id="wh-edit-capacity"
                type="number"
                value={editForm.capacity}
                onChange={(e) => setEditForm((f) => ({ ...f, capacity: e.target.value }))}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!canEdit || editSubmitting}>
                {editSubmitting ? "Saving…" : "Save changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={cropsTarget !== null} onOpenChange={(open) => !open && setCropsTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crop capability</DialogTitle>
            <DialogDescription>Which crops {cropsTarget?.name} can store.</DialogDescription>
          </DialogHeader>
          {cropsLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-lg border p-2">
              {crops.map((crop) => (
                <label key={crop.id} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/50">
                  <input
                    type="checkbox"
                    checked={cropsSelection.has(crop.id)}
                    onChange={() => toggleCropSelection(crop.id)}
                  />
                  {crop.name}
                </label>
              ))}
              {crops.length === 0 && <p className="p-2 text-sm text-muted-foreground">No crops in the catalog.</p>}
            </div>
          )}
          <DialogFooter>
            <Button onClick={saveCrops} disabled={cropsLoading || cropsSubmitting}>
              {cropsSubmitting ? "Saving…" : "Save crops"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
