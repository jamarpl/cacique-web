"use client";

import { useMemo } from "react";
import { ResponsiveContainer, Tooltip, Treemap } from "recharts";
import { useSequentialChartRamp } from "@/lib/chart-color";
import type { WarehouseUtilizationEntry } from "@/lib/api";

interface TreemapNode {
  name: string;
  size: number;
  utilizationPercent: number;
  crateCount: number;
  // Recharts' TreemapDataType requires an index signature.
  [key: string]: unknown;
}

// Recharts' Treemap invokes `content` as a plain function with the node's
// own data fields (name, size, utilizationPercent, ...) spread directly
// onto its argument alongside layout fields (x/y/width/height/depth) — NOT
// nested under a `.payload` key like Tooltip's renderer. depth 0 is the
// synthetic root wrapping the whole chart; only depth 1 nodes are our
// per-warehouse leaves.
interface TreemapContentProps extends Partial<TreemapNode> {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  colorFor?: (t: number) => string;
}

function TreemapCell(props: TreemapContentProps) {
  const { x = 0, y = 0, width = 0, height = 0, depth, name, utilizationPercent, colorFor } = props;
  if (depth !== 1 || name === undefined || utilizationPercent === undefined || !colorFor) return null;

  const fill = colorFor(utilizationPercent / 100);
  const showLabel = width > 64 && height > 28;
  const showSubLabel = showLabel && height > 44;
  // The sequential ramp spans light to dark, so a fixed ink color can't stay
  // readable on every tile — instead of picking ink per-tile, anchor a
  // translucent dark scrim behind the label so white text always has
  // contrast regardless of the fill underneath.
  const scrimHeight = showSubLabel ? 40 : 24;

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={4}
        style={{ fill, stroke: "var(--card)", strokeWidth: 2 }}
      />
      {showLabel && (
        <>
          <rect
            x={x}
            y={y}
            width={width}
            height={Math.min(scrimHeight, height)}
            rx={4}
            fill="rgba(0,0,0,0.32)"
            className="pointer-events-none"
          />
          <text x={x + 8} y={y + 20} fontSize={11} fontWeight={500} fill="#fff" className="pointer-events-none">
            {name}
          </text>
        </>
      )}
      {showSubLabel && (
        <text x={x + 8} y={y + 36} fontSize={10} fill="rgba(255,255,255,0.82)" className="pointer-events-none">
          {Math.round(utilizationPercent)}% full
        </text>
      )}
    </g>
  );
}

/**
 * UIRB-FE-A1. One rectangle per warehouse from
 * `GET /api/analytics/warehouse-utilization`, sized by `currentWeight`
 * (that endpoint's confirmed primary/weight-based metric — see
 * AnalyticsController.GetWarehouseUtilization's remarks) and colored on the
 * sequential light-to-dark ramp derived from `--chart-1..5`
 * (`useSequentialChartRamp`) by `utilizationPercent`.
 */
export function WarehouseTreemap({ data }: { data: WarehouseUtilizationEntry[] }) {
  const colorFor = useSequentialChartRamp();

  const nodes = useMemo<TreemapNode[]>(
    () =>
      data.map((w) => ({
        name: w.warehouseName,
        // Treemap sizing requires a positive value; a warehouse with zero
        // stored weight still gets a (small) tile rather than disappearing.
        size: Math.max(w.currentWeight, 1),
        utilizationPercent: w.utilizationPercent,
        crateCount: w.currentCrateCount,
      })),
    [data],
  );

  if (nodes.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">No warehouse data yet.</p>;
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={nodes}
          dataKey="size"
          nameKey="name"
          stroke="var(--background)"
          content={<TreemapCell colorFor={colorFor} />}
          isAnimationActive={false}
        >
          <Tooltip
            content={({ payload }) => {
              const node = payload?.[0]?.payload as TreemapNode | undefined;
              if (!node) return null;
              return (
                <div className="rounded-md border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-md">
                  <div className="font-medium">{node.name}</div>
                  <div>{node.size.toLocaleString()} kg stored</div>
                  <div>{node.crateCount} crate{node.crateCount === 1 ? "" : "s"}</div>
                  <div>{Math.round(node.utilizationPercent)}% utilization</div>
                </div>
              );
            }}
          />
        </Treemap>
      </ResponsiveContainer>
    </div>
  );
}
