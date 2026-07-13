"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState } from "@/components/ui/error-state";
import { DispatchPlanDetail } from "@/components/dispatch/dispatch-plan-detail";
import { WeekSummary } from "@/components/dispatch/week-summary";
import { simulationApi, warehousesApi } from "@/lib/api";
import type { AutoModeComparison, DispatchPlan, SimulationRun, Warehouse, WeeklyDispatchPlan } from "@/lib/api";

const EMPTY_FORM = {
  parish: "",
  driverCount: "3",
  vehicleCount: "3",
  customerCount: "20",
  orderCount: "30",
  vehicleCapacityKg: "",
  averageOrderWeightKg: "",
  generateCapacitySpikeTest: false,
};

/**
 * Load-testing UI for the Distribution Engine (enginePlan.md): spawns a
 * batch of synthetic Buyers/Drivers/Vehicles/Orders in a single parish,
 * runs the engine against exactly that batch, and reports how many
 * deliveries the given fleet size could complete across its full working
 * day (a vehicle can run several trips, not just one) — then tears the
 * batch down again. See Cacique.Api/Controllers/SimulationController.cs.
 */
export default function AdminSimulationPage() {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehousesError, setWarehousesError] = useState<string | null>(null);
  const [runs, setRuns] = useState<SimulationRun[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const [planOpen, setPlanOpen] = useState(false);
  const [plan, setPlan] = useState<DispatchPlan | null>(null);
  const [planLoadingRunId, setPlanLoadingRunId] = useState<string | null>(null);

  const [weekOpen, setWeekOpen] = useState(false);
  const [weekPlan, setWeekPlan] = useState<WeeklyDispatchPlan | null>(null);
  const [weekLoadingRunId, setWeekLoadingRunId] = useState<string | null>(null);

  const [compareOpen, setCompareOpen] = useState(false);
  const [comparison, setComparison] = useState<AutoModeComparison | null>(null);
  const [compareLoadingRunId, setCompareLoadingRunId] = useState<string | null>(null);

  const [confirmDeleteAllOpen, setConfirmDeleteAllOpen] = useState(false);

  function loadRuns() {
    setRunsLoading(true);
    simulationApi
      .listRuns()
      .then(setRuns)
      .catch(() => {})
      .finally(() => setRunsLoading(false));
  }

  function loadWarehouses() {
    const controller = new AbortController();
    setWarehousesError(null);
    warehousesApi
      .list({ status: "Active" }, controller.signal)
      .then(setWarehouses)
      .catch(() => {
        if (!controller.signal.aborted) setWarehousesError("Couldn't load parishes.");
      });
    return controller;
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const controller = loadWarehouses();
    loadRuns();
    return () => controller.abort();
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const parishes = Array.from(new Set(warehouses.map((w) => w.parish))).sort();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const created = await simulationApi.createRun({
        parish: form.parish,
        driverCount: Number(form.driverCount),
        vehicleCount: Number(form.vehicleCount),
        customerCount: Number(form.customerCount),
        orderCount: Number(form.orderCount),
        vehicleCapacityKg: form.vehicleCapacityKg.trim() === "" ? null : Number(form.vehicleCapacityKg),
        averageOrderWeightKg: form.averageOrderWeightKg.trim() === "" ? null : Number(form.averageOrderWeightKg),
        generateCapacitySpikeTest: form.generateCapacitySpikeTest,
      });
      toast.success("Simulation run created.");
      setForm(EMPTY_FORM);
      setOpen(false);
      loadRuns();

      if (form.generateCapacitySpikeTest) {
        await handleTestAutoMode(created);
      }
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePlan(run: SimulationRun) {
    setPlanLoadingRunId(run.id);
    try {
      const result = await simulationApi.plan(run.id);
      setPlan(result);
      setPlanOpen(true);
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setPlanLoadingRunId(null);
    }
  }

  async function handlePlanWeek(run: SimulationRun) {
    setWeekLoadingRunId(run.id);
    try {
      const result = await simulationApi.planWeek(run.id);
      setWeekPlan(result);
      setWeekOpen(true);
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setWeekLoadingRunId(null);
    }
  }

  async function handleTestAutoMode(run: SimulationRun) {
    setCompareLoadingRunId(run.id);
    try {
      const result = await simulationApi.compareAutoMode(run.id);
      setComparison(result);
      setCompareOpen(true);
    } catch {
      // Error toast already surfaced by the API client.
    } finally {
      setCompareLoadingRunId(null);
    }
  }

  async function handleDelete(runId: string) {
    try {
      await simulationApi.deleteRun(runId);
      toast.success("Simulation run deleted.");
      loadRuns();
    } catch {
      // Error toast already surfaced by the API client.
    }
  }

  async function handleDeleteAll() {
    setConfirmDeleteAllOpen(false);
    try {
      await simulationApi.deleteAllRuns();
      toast.success("All simulation runs and their spawned entities were deleted.");
      loadRuns();
    } catch {
      // Error toast already surfaced by the API client.
    }
  }

  const canSubmit =
    form.parish.trim() !== "" &&
    Number(form.driverCount) > 0 &&
    Number(form.vehicleCount) > 0 &&
    Number(form.customerCount) > 0 &&
    Number(form.orderCount) > 0;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle>Simulation</CardTitle>
            <CardDescription>
              Spawn a synthetic fleet and order book in one parish, then ask the Distribution Engine how many
              deliveries it can complete across a 6am-6pm working day. Every entity created here is deleted with
              its run.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {runs.length > 0 && (
              <Dialog open={confirmDeleteAllOpen} onOpenChange={setConfirmDeleteAllOpen}>
                <DialogTrigger render={<Button variant="outline">Destroy all simulations</Button>} />
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Destroy all simulation data?</DialogTitle>
                    <DialogDescription>
                      This permanently deletes all {runs.length} simulation run{runs.length === 1 ? "" : "s"} —
                      past and present — and every Buyer, Driver, Vehicle, and Order spawned by any of them. Real
                      (non-simulated) data is never touched. This cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setConfirmDeleteAllOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="destructive" onClick={handleDeleteAll}>
                      Destroy everything
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger render={<Button>New run</Button>} />
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>New simulation run</DialogTitle>
                  <DialogDescription>
                    Requires an active warehouse in the chosen parish — that warehouse becomes the base for every
                    spawned driver and vehicle.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="sim-parish">Parish</Label>
                    <Select value={form.parish} onValueChange={(v) => setForm((f) => ({ ...f, parish: v ?? "" }))}>
                      <SelectTrigger id="sim-parish" className="w-full">
                        <SelectValue placeholder="Choose a parish" />
                      </SelectTrigger>
                      <SelectContent>
                        {parishes.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {warehousesError && parishes.length === 0 && (
                      <ErrorState onRetry={loadWarehouses} className="mt-1" />
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="sim-drivers">Drivers</Label>
                      <Input
                        id="sim-drivers"
                        type="number"
                        min={1}
                        value={form.driverCount}
                        onChange={(e) => setForm((f) => ({ ...f, driverCount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-vehicles">Vehicles</Label>
                      <Input
                        id="sim-vehicles"
                        type="number"
                        min={1}
                        value={form.vehicleCount}
                        onChange={(e) => setForm((f) => ({ ...f, vehicleCount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-customers">Customers</Label>
                      <Input
                        id="sim-customers"
                        type="number"
                        min={1}
                        value={form.customerCount}
                        onChange={(e) => setForm((f) => ({ ...f, customerCount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-orders">Orders</Label>
                      <Input
                        id="sim-orders"
                        type="number"
                        min={1}
                        value={form.orderCount}
                        onChange={(e) => setForm((f) => ({ ...f, orderCount: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-capacity">Vehicle capacity (kg, optional)</Label>
                      <Input
                        id="sim-capacity"
                        type="number"
                        value={form.vehicleCapacityKg}
                        onChange={(e) => setForm((f) => ({ ...f, vehicleCapacityKg: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sim-avg-weight">Avg order weight (kg, optional)</Label>
                      <Input
                        id="sim-avg-weight"
                        type="number"
                        value={form.averageOrderWeightKg}
                        onChange={(e) => setForm((f) => ({ ...f, averageOrderWeightKg: e.target.value }))}
                      />
                    </div>
                  </div>
                  <label className="flex items-start gap-2 rounded-lg border p-3 text-sm">
                    <Checkbox
                      checked={form.generateCapacitySpikeTest}
                      onCheckedChange={(checked) => setForm((f) => ({ ...f, generateCapacitySpikeTest: checked === true }))}
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium">Generate as &quot;I&apos;ve Got This&quot; test</span>
                      <br />
                      <span className="text-xs text-muted-foreground">
                        Dumps roughly half the week&apos;s orders onto one random day — deliberately past what the
                        fleet can handle — and spreads the rest across the other 6. Opens the basic-vs-smart
                        comparison automatically once created.
                      </span>
                    </span>
                  </label>
                  <DialogFooter>
                    <Button type="submit" disabled={!canSubmit || submitting}>
                      {submitting
                        ? "Creating…"
                        : form.generateCapacitySpikeTest
                          ? "Create run & test"
                          : "Create run"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {runsLoading && runs.length === 0 ? (
            <div className="space-y-2 py-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : runs.length === 0 ? (
            <p className="py-4 text-sm text-muted-foreground">No simulation runs yet — create one above.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parish</TableHead>
                  <TableHead>Warehouse</TableHead>
                  <TableHead>Drivers</TableHead>
                  <TableHead>Vehicles</TableHead>
                  <TableHead>Customers</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.parish}</TableCell>
                    <TableCell>{run.warehouseName}</TableCell>
                    <TableCell>{run.driverCount}</TableCell>
                    <TableCell>{run.vehicleCount}</TableCell>
                    <TableCell>{run.customerCount}</TableCell>
                    <TableCell>{run.orderCount}</TableCell>
                    <TableCell>{new Date(run.createdAtUtc).toLocaleString()}</TableCell>
                    <TableCell className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
                        disabled={planLoadingRunId === run.id}
                        onClick={() => handlePlan(run)}
                      >
                        {planLoadingRunId === run.id ? "Planning…" : "Run plan"}
                      </button>
                      <button
                        type="button"
                        className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
                        disabled={weekLoadingRunId === run.id}
                        onClick={() => handlePlanWeek(run)}
                      >
                        {weekLoadingRunId === run.id ? "Planning…" : "Weekly plan"}
                      </button>
                      <button
                        type="button"
                        className="text-primary underline-offset-4 hover:underline disabled:opacity-50"
                        disabled={compareLoadingRunId === run.id}
                        onClick={() => handleTestAutoMode(run)}
                      >
                        {compareLoadingRunId === run.id ? "Testing…" : "Test I've Got This"}
                      </button>
                      <button
                        type="button"
                        className="text-destructive underline-offset-4 hover:underline"
                        onClick={() => handleDelete(run.id)}
                      >
                        Delete
                      </button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={planOpen} onOpenChange={setPlanOpen}>
        <DialogContent className="max-h-[90vh] w-full sm:max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Dispatch plan</DialogTitle>
            <DialogDescription>
              Dry-run output from the Distribution Engine — nothing was persisted to the real fleet or order book.
            </DialogDescription>
          </DialogHeader>
          {plan && <DispatchPlanDetail plan={plan} />}
        </DialogContent>
      </Dialog>

      <Dialog open={weekOpen} onOpenChange={setWeekOpen}>
        <DialogContent className="max-h-[90vh] w-full sm:max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Weekly plan</DialogTitle>
            <DialogDescription>
              {weekPlan && (
                <>
                  {weekPlan.weekStart} to {weekPlan.weekEnd} — each order&apos;s day is chosen per its buyer&apos;s
                  actual &quot;I&apos;ve Got This&quot; preferences.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          {weekPlan && <WeekSummary plan={weekPlan} />}
        </DialogContent>
      </Dialog>

      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="max-h-[90vh] w-full sm:max-w-7xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test &quot;I&apos;ve Got This&quot;</DialogTitle>
            <DialogDescription>
              Same order set, same week, planned twice: every buyer forced into basic (exact-date) mode on the
              left, every buyer forced into auto-mode on the right — regardless of what each simulated
              buyer&apos;s own opt-in actually says.
            </DialogDescription>
          </DialogHeader>
          {comparison && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="space-y-3 lg:border-r lg:pr-6">
                <WeekSummary plan={comparison.basicMode} title="Basic mode (exact requested date)" />
              </div>
              <div className="space-y-3">
                <WeekSummary plan={comparison.smartMode} title="I've Got This (smart schedule)" />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
