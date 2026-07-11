"use client";

import { useMemo } from "react";
import { useSequentialChartRamp } from "@/lib/chart-color";
import type { WarehouseUtilizationEntry } from "@/lib/api";

/**
 * Horizontal bar list replacing the old treemap on the overview dashboard —
 * same data source (`GET /api/analytics/warehouse-utilization`) and the same
 * "light = low, dark = high" sequential convention, just a more legible
 * layout than a treemap at small sizes. Sorted descending by utilization so
 * the busiest warehouses lead; capped to the top N via `limit`.
 */
export function WarehouseUtilizationBars({
  data,
  limit = 8,
}: {
  data: WarehouseUtilizationEntry[];
  limit?: number;
}) {
  const colorFor = useSequentialChartRamp();

  const rows = useMemo(
    () =>
      [...data]
        .sort((a, b) => b.utilizationPercent - a.utilizationPercent)
        .slice(0, limit),
    [data, limit],
  );

  if (rows.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No warehouse data yet.</p>;
  }

  return (
    <div className="space-y-3">
      {rows.map((w) => {
        const pct = Math.max(0, Math.min(100, w.utilizationPercent));
        return (
          <div key={w.warehouseId} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="truncate font-medium">{w.warehouseName}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {Math.round(w.utilizationPercent)}% · {w.currentWeight.toLocaleString()} kg
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width]"
                style={{ width: `${pct}%`, backgroundColor: colorFor(pct / 100) }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
