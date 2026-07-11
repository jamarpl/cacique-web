"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { driversApi, farmersApi, type Driver, type Farmer } from "@/lib/api";
import { useActingIdentity, type ActingRole } from "@/lib/identity/acting-identity-context";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * The actual role/farmer/driver picking form, shared by the full-page
 * landing (`/`, when no identity is selected yet) and the header's "switch
 * identity" dialog (once one is already selected).
 */
export function IdentitySelectorForm({ onApplied }: { onApplied?: () => void }) {
  const router = useRouter();
  const { role, farmerId, driverId, setRole, setFarmer, setDriver } = useActingIdentity();

  const [pendingRole, setPendingRole] = useState<ActingRole | null>(role);
  const [pendingFarmerId, setPendingFarmerId] = useState<string>(farmerId ?? "");
  const [pendingDriverId, setPendingDriverId] = useState<string>(driverId ?? "");
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Kicks off an external fetch (the farmer list) when the selected role
  // changes to "farmer" — the sanctioned "subscribe to an external system"
  // effect use case the lint rule's own message describes.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (pendingRole !== "farmer") return;
    const controller = new AbortController();
    setLoadingFarmers(true);
    farmersApi
      .list(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setFarmers(data);
      })
      .catch(() => {
        // Error toast already shown by the API client; nothing extra to do here.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingFarmers(false);
      });
    return () => controller.abort();
  }, [pendingRole]);

  useEffect(() => {
    if (pendingRole !== "driver") return;
    const controller = new AbortController();
    setLoadingDrivers(true);
    driversApi
      .list(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setDrivers(data);
      })
      .catch(() => {
        // Error toast already shown by the API client; nothing extra to do here.
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingDrivers(false);
      });
    return () => controller.abort();
  }, [pendingRole]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const canApply =
    pendingRole === "admin" ||
    (pendingRole === "farmer" && pendingFarmerId !== "") ||
    (pendingRole === "driver" && pendingDriverId !== "");

  function handleApply() {
    if (pendingRole === null || !canApply) return;

    setRole(pendingRole);
    if (pendingRole === "farmer") {
      const farmer = farmers.find((f) => f.id === pendingFarmerId);
      setFarmer(pendingFarmerId, farmer?.name ?? null);
    } else if (pendingRole === "driver") {
      const driver = drivers.find((d) => d.id === pendingDriverId);
      setDriver(pendingDriverId, driver?.name ?? null);
    }

    onApplied?.();
    router.push(pendingRole === "farmer" ? "/farmer" : pendingRole === "driver" ? "/driver" : "/admin");
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Demo mode — this selection is <span className="font-medium text-foreground">not</span> a security
        boundary. It only tells the app which role and (for Farmer/Driver) which farmer or driver to scope
        screens and API calls to.
      </p>

      <div className="space-y-2">
        <Label htmlFor="identity-role">Role</Label>
        <Select
          value={pendingRole ?? ""}
          onValueChange={(value) => setPendingRole(value ? (value as ActingRole) : null)}
        >
          <SelectTrigger id="identity-role" className="w-full">
            <SelectValue placeholder="Choose a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="farmer">Farmer</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="driver">Driver</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {pendingRole === "farmer" && (
        <div className="space-y-2">
          <Label htmlFor="identity-farmer">Acting farmer</Label>
          <Select
            value={pendingFarmerId}
            onValueChange={(value) => setPendingFarmerId(value ?? "")}
            disabled={loadingFarmers || farmers.length === 0}
          >
            <SelectTrigger id="identity-farmer" className="w-full">
              <SelectValue placeholder={loadingFarmers ? "Loading farmers…" : "Choose a farmer"} />
            </SelectTrigger>
            <SelectContent>
              {farmers.map((farmer) => (
                <SelectItem key={farmer.id} value={farmer.id}>
                  {farmer.name} — {farmer.farmName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loadingFarmers && farmers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No farmers registered yet. Register one first (Admin → Farmers, once available).
            </p>
          )}
        </div>
      )}

      {pendingRole === "driver" && (
        <div className="space-y-2">
          <Label htmlFor="identity-driver">Acting driver</Label>
          <Select
            value={pendingDriverId}
            onValueChange={(value) => setPendingDriverId(value ?? "")}
            disabled={loadingDrivers || drivers.length === 0}
          >
            <SelectTrigger id="identity-driver" className="w-full">
              <SelectValue placeholder={loadingDrivers ? "Loading drivers…" : "Choose a driver"} />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id}>
                  {driver.name}
                  {driver.homeWarehouseName ? ` — ${driver.homeWarehouseName}` : ""}
                  {driver.simulationRunId ? " (simulated)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!loadingDrivers && drivers.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No drivers registered yet. Register one first (Admin → Fleet).
            </p>
          )}
        </div>
      )}

      <Button onClick={handleApply} disabled={!canApply} className="w-full">
        {pendingRole === "farmer"
          ? "Continue as Farmer"
          : pendingRole === "admin"
            ? "Continue as Admin"
            : pendingRole === "driver"
              ? "Continue as Driver"
              : "Continue"}
      </Button>
    </div>
  );
}
