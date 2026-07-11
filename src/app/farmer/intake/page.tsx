"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { useActingIdentity } from "@/lib/identity/acting-identity-context";
import { warehousesApi, cropsApi, intakeApi } from "@/lib/api";
import type { Warehouse, Crop, IntakeResponse } from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * UIRB-FE-F2. Farmer-scoping: `farmerId` is taken from the acting identity
 * (never shown as a picker — the acting farmer IS the farmer registering the
 * batch) and sent as part of `CreateIntakeRequest`. Warehouse/crop lists are
 * global catalogs, not farmer-owned data, so they're fetched unscoped.
 */
export default function IntakePage() {
  const { farmerId } = useActingIdentity();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [crops, setCrops] = useState<Crop[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [cropId, setCropId] = useState("");
  const [grade, setGrade] = useState("");
  const [totalWeight, setTotalWeight] = useState("");
  const [harvestDate, setHarvestDate] = useState("");
  const [crateCount, setCrateCount] = useState("1");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    warehousesApi
      .list({ status: "Active" }, controller.signal)
      .then(setWarehouses)
      .catch(() => {});
    return () => controller.abort();
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCropId("");
    if (!warehouseId) {
      setCrops([]);
      return;
    }
    const controller = new AbortController();
    cropsApi
      .list({ warehouseId }, controller.signal)
      .then(setCrops)
      .catch(() => {});
    return () => controller.abort();
  }, [warehouseId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const canSubmit =
    farmerId !== null &&
    warehouseId !== "" &&
    cropId !== "" &&
    grade.trim() !== "" &&
    Number(totalWeight) > 0 &&
    harvestDate !== "" &&
    Number(crateCount) > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !farmerId) return;
    setSubmitting(true);
    setResult(null);
    try {
      const response = await intakeApi.create({
        farmerId,
        warehouseId,
        cropId,
        grade: grade.trim(),
        totalWeight: Number(totalWeight),
        harvestDate: new Date(harvestDate).toISOString(),
        crateCount: Number(crateCount),
      });
      setResult(response);
      toast.success(`Batch registered — ${response.crates.length} crate(s) created.`);
      setGrade("");
      setTotalWeight("");
      setHarvestDate("");
      setCrateCount("1");
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
          <CardTitle>Register intake</CardTitle>
          <CardDescription>
            Record a new produce batch and generate its serialized crates with QR codes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="intake-warehouse">Warehouse</Label>
              <Select value={warehouseId} onValueChange={(v) => setWarehouseId(v ?? "")}>
                <SelectTrigger id="intake-warehouse" className="w-full">
                  <SelectValue placeholder="Choose a warehouse" />
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

            <div className="space-y-2">
              <Label htmlFor="intake-crop">Crop</Label>
              <Select value={cropId} onValueChange={(v) => setCropId(v ?? "")} disabled={!warehouseId}>
                <SelectTrigger id="intake-crop" className="w-full">
                  <SelectValue placeholder={warehouseId ? "Choose a crop" : "Choose a warehouse first"} />
                </SelectTrigger>
                <SelectContent>
                  {crops.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {warehouseId && crops.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  This warehouse has no crop capabilities configured.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="intake-grade">Grade</Label>
              <Input id="intake-grade" value={grade} onChange={(e) => setGrade(e.target.value)} placeholder="e.g. A" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intake-weight">Total weight (kg)</Label>
              <Input
                id="intake-weight"
                type="number"
                min="0"
                step="0.01"
                value={totalWeight}
                onChange={(e) => setTotalWeight(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intake-harvest-date">Harvest date</Label>
              <Input
                id="intake-harvest-date"
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="intake-crate-count">Crate count</Label>
              <Input
                id="intake-crate-count"
                type="number"
                min="1"
                step="1"
                value={crateCount}
                onChange={(e) => setCrateCount(e.target.value)}
              />
            </div>

            <div className="sm:col-span-2">
              <Button type="submit" disabled={!canSubmit || submitting}>
                {submitting ? "Registering…" : "Register batch"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Generated crates</CardTitle>
            <CardDescription>
              Batch {result.batchId} — {result.cropName}, {result.totalWeight}kg across {result.crates.length}{" "}
              crate(s).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.crates.map((crate) => (
                <div key={crate.id} className="flex items-center gap-3 rounded-lg border p-3">
                  {crate.qrImageBase64 && (
                    <Image
                      src={`data:image/png;base64,${crate.qrImageBase64}`}
                      alt={`QR code for crate ${crate.qrCode}`}
                      width={72}
                      height={72}
                      unoptimized
                    />
                  )}
                  <div className="text-xs">
                    <div className="font-medium break-all">{crate.qrCode}</div>
                    <div className="text-muted-foreground">
                      {crate.weight}kg · Grade {crate.grade}
                    </div>
                    <div className="text-muted-foreground">{crate.currentStatus}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
