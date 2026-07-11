"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import RouteMapLoader from "@/components/map/route-map-loader";
import { distributionApi, driversApi, simulationApi } from "@/lib/api";
import type { Driver, DispatchPlan, VehicleRoute } from "@/lib/api";
import { useActingIdentity } from "@/lib/identity/acting-identity-context";

/**
 * Driver-facing route view. Which driver is "acting" comes from the shared
 * identity system (same pattern as Farmer/Admin — see
 * IdentitySelectorForm/RoleGuard), so this page assumes `driverId` is
 * already set by the time it renders (DriverLayout's RoleGuard guarantees
 * that).
 *
 * A driver's route can come from either planning source depending on how
 * they were created: a real driver's route comes from the live Distribution
 * Engine plan (GET /api/distribution/plan); a driver spawned by a
 * simulation run only appears in that run's own plan
 * (POST /api/simulation/runs/{id}/plan) — see Driver.simulationRunId.
 */
export default function DriverPage() {
  const { driverId, driverName } = useActingIdentity();

  const [driver, setDriver] = useState<Driver | null>(null);
  const [driverLoading, setDriverLoading] = useState(true);

  const [plan, setPlan] = useState<DispatchPlan | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!driverId) return;
    const controller = new AbortController();
    setDriverLoading(true);
    driversApi
      .list(controller.signal)
      .then((all) => {
        if (!controller.signal.aborted) setDriver(all.find((d) => d.id === driverId) ?? null);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setDriverLoading(false);
      });
    return () => controller.abort();
  }, [driverId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function loadPlan(current: Driver) {
    setPlanLoading(true);
    setPlanError(null);
    try {
      const result = current.simulationRunId
        ? await simulationApi.plan(current.simulationRunId)
        : await distributionApi.getPlan();
      setPlan(result);
    } catch {
      setPlanError("Could not load today's plan.");
    } finally {
      setPlanLoading(false);
    }
  }

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (driver) {
      loadPlan(driver);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [driver?.id]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const myRoute: VehicleRoute | undefined = plan?.routes.find((r) => r.driverId === driverId);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>
              {driverLoading ? "Loading…" : (driver?.name ?? driverName ?? "Driver")}
              {driver?.simulationRunId && (
                <Badge variant="outline" className="ml-2">
                  Simulated driver
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Base: {driver?.homeWarehouseName ?? (driverLoading ? "Loading…" : "Not assigned to a warehouse yet")}
            </CardDescription>
          </div>
          {driver && (
            <Button variant="outline" onClick={() => loadPlan(driver)} disabled={planLoading}>
              {planLoading ? "Refreshing…" : "Refresh"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {driverLoading || (planLoading && !plan) ? (
            <div className="space-y-2">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-96 w-full" />
            </div>
          ) : !driver ? (
            <p className="text-sm text-destructive">Driver profile not found — try switching identity again.</p>
          ) : planError ? (
            <p className="text-sm text-destructive">{planError}</p>
          ) : !driver.homeWarehouseId ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re not assigned to a warehouse, so the Distribution Engine has nowhere to base your route
              from.
            </p>
          ) : !myRoute || myRoute.tripCount === 0 ? (
            <p className="text-sm text-muted-foreground">No deliveries assigned to you today.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Stat label="Trips" value={myRoute.tripCount} />
                <Stat label="Deliveries" value={myRoute.deliveryCount} />
                <Stat label="Distance" value={`${myRoute.totalDistanceKm.toFixed(1)} km`} />
                <Stat label="Avg load" value={`${myRoute.capacityUtilizationPercent.toFixed(0)}%`} />
              </div>

              <RouteMapLoader routes={plan!.routes} focusVehicleId={myRoute.vehicleId} className="h-[28rem]" />

              <div className="space-y-2">
                {myRoute.trips.map((trip) => (
                  <div key={trip.tripNumber} className="rounded-lg border p-3">
                    <div className="mb-2 flex items-center justify-between text-sm font-medium">
                      <span>
                        Trip {trip.tripNumber}: {trip.departureTime.slice(0, 5)} → {trip.returnTime.slice(0, 5)}
                      </span>
                      <span className="text-muted-foreground">
                        {trip.loadedWeightKg.toFixed(0)}kg · {trip.distanceKm.toFixed(1)}km
                      </span>
                    </div>
                    <ol className="ml-4 list-decimal space-y-1 text-sm text-muted-foreground">
                      {trip.stops.map((stop) => (
                        <li key={stop.orderId}>
                          <span className="text-foreground">{stop.buyerName}</span> — {stop.orderWeight}kg
                          {stop.estimatedArrival && ` (ETA ${stop.estimatedArrival.slice(0, 5)})`}
                        </li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}
