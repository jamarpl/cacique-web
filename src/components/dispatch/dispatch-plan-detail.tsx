import { Badge } from "@/components/ui/badge";
import RouteMapLoader from "@/components/map/route-map-loader";
import type { DispatchPlan } from "@/lib/api";

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
    </div>
  );
}

/**
 * Full detail view of one Distribution Engine dispatch plan: stat tiles,
 * route map, per-vehicle trip breakdown, and unfulfilled orders. Shared by
 * the single-day plan dialog and each day's drill-down in the weekly view
 * (admin/simulation) — same shape, same rendering, whether the plan came
 * from a single day or one day of a week.
 */
export function DispatchPlanDetail({ plan }: { plan: DispatchPlan }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total orders" value={plan.totalOrders} />
        <Stat label="Delivered" value={plan.deliveredOrders} />
        <Stat label="Unfulfilled" value={plan.unfulfilledOrdersCount} />
        <Stat label="Total km" value={plan.totalDistanceKm.toFixed(1)} />
        <Stat label="Deliveries / km" value={plan.deliveriesPerKm.toFixed(2)} />
        <Stat label="Avg utilization" value={`${plan.averageVehicleUtilizationPercent.toFixed(0)}%`} />
        <Stat label="Vehicles used" value={plan.routes.filter((r) => r.deliveryCount > 0).length} />
        <Stat label="Total trips" value={plan.routes.reduce((sum, r) => sum + r.tripCount, 0)} />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Route map</h3>
        <RouteMapLoader routes={plan.routes} unfulfilledOrders={plan.unfulfilledOrders} className="h-[28rem]" />
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Vehicle routes</h3>
        <div className="space-y-2">
          {plan.routes.map((route) => (
            <details key={route.vehicleId} className="rounded-lg border">
              <summary className="flex cursor-pointer items-center justify-between gap-4 p-3 text-sm">
                <span className="font-medium">
                  {route.vehiclePlateNumber} — {route.driverName}
                </span>
                <span className="flex gap-4 text-muted-foreground">
                  <span>
                    {route.tripCount} trip{route.tripCount === 1 ? "" : "s"}
                  </span>
                  <span>{route.deliveryCount} deliveries</span>
                  <span>{route.capacityUtilizationPercent.toFixed(0)}% avg load</span>
                  <span>{route.totalDistanceKm.toFixed(1)} km</span>
                </span>
              </summary>
              <div className="space-y-2 border-t p-3">
                {route.trips.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Idle all day — no deliveries assigned.</p>
                ) : (
                  route.trips.map((trip) => (
                    <div key={trip.tripNumber} className="rounded border p-2">
                      <div className="mb-1 flex items-center justify-between text-xs font-medium">
                        <span>
                          Trip {trip.tripNumber}: {trip.departureTime.slice(0, 5)} → {trip.returnTime.slice(0, 5)}
                        </span>
                        <span className="text-muted-foreground">
                          {trip.loadedWeightKg.toFixed(0)}kg · {trip.distanceKm.toFixed(1)}km ·{" "}
                          {trip.durationMinutes.toFixed(0)}min
                        </span>
                      </div>
                      <ol className="ml-4 list-decimal space-y-0.5 text-xs text-muted-foreground">
                        {trip.stops.map((stop) => (
                          <li key={stop.orderId}>
                            {stop.buyerName} — {stop.orderWeight}kg
                            {stop.estimatedArrival && ` (ETA ${stop.estimatedArrival.slice(0, 5)})`}
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))
                )}
              </div>
            </details>
          ))}
        </div>
      </div>

      {plan.unfulfilledOrders.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold">Unfulfilled orders</h3>
          <div className="space-y-1">
            {plan.unfulfilledOrders.slice(0, 20).map((o) => (
              <div key={o.orderId} className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{o.buyerName}</span>
                <Badge variant="outline">{o.reason}</Badge>
              </div>
            ))}
            {plan.unfulfilledOrders.length > 20 && (
              <p className="text-xs text-muted-foreground">…and {plan.unfulfilledOrders.length - 20} more.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
