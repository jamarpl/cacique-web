"use client";

import { useMemo } from "react";
import type { WarehouseUtilizationEntry } from "@/lib/api";

/**
 * Capacity-health view for the Warehouses page: same utilization data as the
 * overview's sequential-ramp bars, but colored by semantic threshold
 * (healthy/near-capacity/overloaded) instead of a magnitude gradient — the
 * question this page needs answered isn't "who's biggest" but "who needs
 * attention", so red/amber/green reads faster than light/dark here.
 */
const THRESHOLDS = {
  warning: 70,
  critical: 90,
} as const;

function healthColor(pct: number): string {
  if (pct >= THRESHOLDS.critical) return "var(--critical)";
  if (pct >= THRESHOLDS.warning) return "var(--warning)";
  return "var(--good)";
}

function healthLabel(pct: number): string {
  if (pct >= THRESHOLDS.critical) return "Near capacity";
  if (pct >= THRESHOLDS.warning) return "Filling up";
  return "Healthy";
}

export function WarehouseCapacityHealth({ data }: { data: WarehouseUtilizationEntry[] }) {
  const rows = useMemo(
    () => [...data].sort((a, b) => b.utilizationPercent - a.utilizationPercent),
    [data],
  );

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No warehouse data yet.</p>;
  }

  const counts = rows.reduce(
    (acc, w) => {
      const pct = w.utilizationPercent;
      if (pct >= THRESHOLDS.critical) acc.critical += 1;
      else if (pct >= THRESHOLDS.warning) acc.warning += 1;
      else acc.good += 1;
      return acc;
    },
    { good: 0, warning: 0, critical: 0 },
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: "var(--good)" }} />
          {counts.good} healthy
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: "var(--warning)" }} />
          {counts.warning} filling up
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ backgroundColor: "var(--critical)" }} />
          {counts.critical} near capacity
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((w) => {
          const pct = Math.max(0, Math.min(100, w.utilizationPercent));
          const color = healthColor(w.utilizationPercent);
          return (
            <div key={w.warehouseId} className="rounded-lg border p-3">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{w.warehouseName}</span>
                <span className="shrink-0 text-xs font-medium" style={{ color }}>
                  {healthLabel(w.utilizationPercent)}
                </span>
              </div>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-[width]"
                  style={{ width: `${pct}%`, backgroundColor: color }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-xs text-muted-foreground">
                <span>{w.currentWeight.toLocaleString()} / {w.capacity.toLocaleString()} kg</span>
                <span>{Math.round(w.utilizationPercent)}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
