"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, CircleMarker, Polyline, Popup, useMap } from "react-leaflet";
import type { UnfulfilledOrder, VehicleRoute } from "@/lib/api";

// Leaflet's default marker icon paths break under webpack/Turbopack bundling
// (they resolve to a URL that doesn't exist in the build output) — the
// standard workaround is to point the default icon at Leaflet's own CDN
// assets instead of trying to bundle them.
const warehouseIcon = new L.Icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const VEHICLE_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#d97706", // amber
  "#9333ea", // purple
  "#0891b2", // cyan
  "#db2777", // pink
  "#65a30d", // lime
];

function colorForIndex(index: number): string {
  return VEHICLE_COLORS[index % VEHICLE_COLORS.length];
}

/** Numbered pin (1, 2, 3...) for a stop, in visit order — color matches the trip's polyline. */
function numberedStopIcon(number: number, color: string): L.DivIcon {
  return L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      color:#fff;
      width:22px;
      height:22px;
      border-radius:9999px;
      border:2px solid #fff;
      box-shadow:0 1px 3px rgba(0,0,0,0.4);
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:11px;
      font-weight:600;
      font-family:system-ui,sans-serif;
    ">${number}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

interface FitBoundsProps {
  points: [number, number][];
}

/** Auto-fits the map viewport to every plotted point once, on data change. */
function FitBounds({ points }: FitBoundsProps) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [32, 32] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(points)]);

  return null;
}

export interface RouteMapProps {
  routes: VehicleRoute[];
  unfulfilledOrders?: UnfulfilledOrder[];
  /** When set, only this vehicle's trips are drawn (used by the driver page). */
  focusVehicleId?: string;
  /** When set (alongside focusVehicleId), only this one trip is drawn — used by the driver page's trip click. */
  focusTripNumber?: number;
  className?: string;
}

/**
 * Plots a Distribution Engine plan on a map: warehouse markers, each
 * vehicle's trips as colored polylines, and stop markers with popups. Each
 * trip draws its real, road-following path (`trip.routeGeometry`, fetched
 * server-side via the Mapbox Directions API) when available, falling back
 * to a straight line through the stops in order when it isn't (no Mapbox
 * token, a stop never resolved coordinates, or the request failed).
 */
export default function RouteMap({
  routes,
  unfulfilledOrders = [],
  focusVehicleId,
  focusTripNumber,
  className,
}: RouteMapProps) {
  const visibleRoutes = useMemo(() => {
    const byVehicle = focusVehicleId ? routes.filter((r) => r.vehicleId === focusVehicleId) : routes;
    if (focusTripNumber === undefined) return byVehicle;
    return byVehicle.map((r) => ({ ...r, trips: r.trips.filter((t) => t.tripNumber === focusTripNumber) }));
  }, [routes, focusVehicleId, focusTripNumber]);

  const allPoints = useMemo(() => {
    const points: [number, number][] = [];
    for (const route of visibleRoutes) {
      if (route.warehouseLatitude !== null && route.warehouseLongitude !== null) {
        points.push([route.warehouseLatitude, route.warehouseLongitude]);
      }
      for (const trip of route.trips) {
        for (const stop of trip.stops) {
          if (stop.latitude !== null && stop.longitude !== null) {
            points.push([stop.latitude, stop.longitude]);
          }
        }
      }
    }
    if (!focusVehicleId) {
      for (const order of unfulfilledOrders) {
        if (order.latitude !== null && order.longitude !== null) {
          points.push([order.latitude, order.longitude]);
        }
      }
    }
    return points;
  }, [visibleRoutes, unfulfilledOrders, focusVehicleId]);

  if (allPoints.length === 0) {
    return (
      <div className={`flex items-center justify-center rounded-lg border bg-muted/30 text-sm text-muted-foreground ${className ?? "h-96"}`}>
        No geocoded coordinates to plot yet — add a Mapbox token (see .env.example) so buyer/warehouse addresses
        resolve to real coordinates, or check that this plan has deliveries assigned.
      </div>
    );
  }

  const warehousesById = new Map<string, [number, number]>();

  return (
    <div className={`isolate relative z-0 overflow-hidden rounded-lg border ${className ?? "h-96"}`}>
      <MapContainer center={allPoints[0]} zoom={11} scrollWheelZoom={true} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />

        {visibleRoutes.map((route, routeIndex) => {
          const color = colorForIndex(routeIndex);
          const warehousePos: [number, number] | null =
            route.warehouseLatitude !== null && route.warehouseLongitude !== null
              ? [route.warehouseLatitude, route.warehouseLongitude]
              : null;

          if (warehousePos && !warehousesById.has(route.warehouseId)) {
            warehousesById.set(route.warehouseId, warehousePos);
          }

          return (
            <div key={route.vehicleId}>
              {route.trips.map((trip) => {
                let tripPoints: [number, number][];
                if (trip.routeGeometry && trip.routeGeometry.length > 1) {
                  // Real road-following path from the backend.
                  tripPoints = trip.routeGeometry.map((p): [number, number] => [p.latitude, p.longitude]);
                } else {
                  // Fallback: straight line through stops in order.
                  tripPoints = [];
                  if (warehousePos) tripPoints.push(warehousePos);
                  for (const stop of trip.stops) {
                    if (stop.latitude !== null && stop.longitude !== null) {
                      tripPoints.push([stop.latitude, stop.longitude]);
                    }
                  }
                  if (warehousePos) tripPoints.push(warehousePos);
                }

                return (
                  <div key={`${route.vehicleId}-${trip.tripNumber}`}>
                    {tripPoints.length > 1 && (
                      <Polyline
                        positions={tripPoints}
                        pathOptions={{ color, weight: 3, opacity: 0.75 }}
                      />
                    )}
                    {trip.stops.map((stop, stopIndex) =>
                      stop.latitude !== null && stop.longitude !== null ? (
                        <Marker
                          key={stop.orderId}
                          position={[stop.latitude, stop.longitude]}
                          icon={numberedStopIcon(stopIndex + 1, color)}
                        >
                          <Popup>
                            <div className="text-xs">
                              <div className="font-semibold">{stop.buyerName}</div>
                              <div>{route.vehiclePlateNumber} — Trip {trip.tripNumber}, stop {stopIndex + 1}</div>
                              <div>{stop.orderWeight}kg</div>
                              {stop.estimatedArrival && <div>ETA: {stop.estimatedArrival.slice(0, 5)}</div>}
                            </div>
                          </Popup>
                        </Marker>
                      ) : null,
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        {Array.from(warehousesById.entries()).map(([warehouseId, pos]) => {
          const route = visibleRoutes.find((r) => r.warehouseId === warehouseId);
          return (
            <Marker key={warehouseId} position={pos} icon={warehouseIcon}>
              <Popup>
                <div className="text-xs font-semibold">{route?.warehouseName ?? "Warehouse"}</div>
              </Popup>
            </Marker>
          );
        })}

        {!focusVehicleId &&
          unfulfilledOrders.map((order) =>
            order.latitude !== null && order.longitude !== null ? (
              <CircleMarker
                key={order.orderId}
                center={[order.latitude, order.longitude]}
                radius={5}
                pathOptions={{ color: "#6b7280", fillColor: "#6b7280", fillOpacity: 0.5, dashArray: "2,2" }}
              >
                <Popup>
                  <div className="text-xs">
                    <div className="font-semibold">{order.buyerName} (unfulfilled)</div>
                    <div>{order.reason}</div>
                  </div>
                </Popup>
              </CircleMarker>
            ) : null,
          )}
      </MapContainer>
    </div>
  );
}
