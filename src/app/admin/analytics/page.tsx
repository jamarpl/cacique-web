"use client";

import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { analyticsApi } from "@/lib/api";
import type {
  DeliveryPerformance,
  IntakeTrendEntry,
  InventorySummary,
  RegionalProductionEntry,
  SpoilageResponse,
  WarehouseUtilizationEntry,
} from "@/lib/api";

const CHART_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const tooltipStyle = {
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--popover-foreground)",
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
};

const axisProps = {
  stroke: "var(--muted-foreground)",
  tickLine: false,
  axisLine: false,
} as const;

/**
 * UIRB-FE-A7. Direct port of the existing 6 analytics endpoints — no
 * redesign, one chart per endpoint, plain bar/line/pie as natural for each
 * metric's shape (per the task brief: "don't overthink this one"). Confirmed
 * against the live `AnalyticsController.cs`: inventory-summary,
 * regional-production, warehouse-utilization, delivery-performance,
 * spoilage, intake-trend.
 */
export default function AdminAnalyticsPage() {
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [regional, setRegional] = useState<RegionalProductionEntry[]>([]);
  const [utilization, setUtilization] = useState<WarehouseUtilizationEntry[]>([]);
  const [deliveryPerf, setDeliveryPerf] = useState<DeliveryPerformance | null>(null);
  const [spoilage, setSpoilage] = useState<SpoilageResponse | null>(null);
  const [intakeTrend, setIntakeTrend] = useState<IntakeTrendEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      analyticsApi.getInventorySummary(controller.signal),
      analyticsApi.getRegionalProduction(controller.signal),
      analyticsApi.getWarehouseUtilization(controller.signal),
      analyticsApi.getDeliveryPerformance(controller.signal),
      analyticsApi.getSpoilage(controller.signal),
      analyticsApi.getIntakeTrend(12, controller.signal),
    ])
      .then(([inv, reg, util, perf, spoil, trend]) => {
        if (controller.signal.aborted) return;
        setInventory(inv);
        setRegional(reg);
        setUtilization(util);
        setDeliveryPerf(perf);
        setSpoilage(spoil);
        setIntakeTrend(trend);
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-80 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Network analytics</h1>
        <p className="text-sm text-muted-foreground">Inventory, production, and delivery metrics across the network.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="sm:col-span-2">
          <CardHeader>
            <CardTitle>Intake trend</CardTitle>
            <CardDescription>Weekly intake volume, last 12 weeks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={intakeTrend}>
                  <defs>
                    <linearGradient id="intakeFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="weekStart"
                    className="text-xs"
                    {...axisProps}
                    tickFormatter={(v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                  />
                  <YAxis className="text-xs" {...axisProps} width={40} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: "var(--chart-1)", strokeWidth: 1, strokeDasharray: "3 3" }} />
                  <Area
                    type="monotone"
                    dataKey="totalWeight"
                    name="Weight (kg)"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    fill="url(#intakeFill)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory by status</CardTitle>
            <CardDescription>Current Serialized Crate counts by status.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventory?.byStatus ?? []}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="status" className="text-xs" {...axisProps} />
                  <YAxis className="text-xs" {...axisProps} width={32} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="crateCount" name="Crates" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory by crop</CardTitle>
            <CardDescription>Current crate weight by crop.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={inventory?.byCrop ?? []}
                    dataKey="totalWeight"
                    nameKey="cropName"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                    stroke="var(--card)"
                    strokeWidth={2}
                  >
                    {(inventory?.byCrop ?? []).map((entry, index) => (
                      <Cell key={entry.cropId} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1">
              {(inventory?.byCrop ?? []).map((entry, index) => (
                <li key={entry.cropId} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span
                    className="size-2 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  {entry.cropName}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Regional production</CardTitle>
            <CardDescription>Crate weight by parish.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={regional} layout="vertical">
                  <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" className="text-xs" {...axisProps} />
                  <YAxis type="category" dataKey="parish" width={90} className="text-xs" {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="totalWeight" name="Weight (kg)" fill="var(--chart-2)" radius={[0, 4, 4, 0]} maxBarSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Warehouse utilization</CardTitle>
            <CardDescription>Current stored weight as a percentage of capacity.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={utilization}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="warehouseName" className="text-xs" {...axisProps} hide />
                  <YAxis className="text-xs" {...axisProps} width={40} unit="%" />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="utilizationPercent" name="Utilization %" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery performance</CardTitle>
            <CardDescription>
              Deliveries by status
              {deliveryPerf?.averageDeliveryDurationHours !== null && deliveryPerf?.averageDeliveryDurationHours !== undefined
                ? ` — average duration ${deliveryPerf.averageDeliveryDurationHours.toFixed(1)}h`
                : ""}
              .
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deliveryPerf?.byStatus ?? []}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="status" className="text-xs" {...axisProps} />
                  <YAxis className="text-xs" {...axisProps} width={32} />
                  <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--muted)" }} />
                  <Bar dataKey="count" name="Deliveries" fill="var(--chart-4)" radius={[4, 4, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Spoilage</CardTitle>
            <CardDescription>Rejected/disposed crates.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="flex items-start gap-3 rounded-lg bg-serious/10 p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-serious/15 text-serious">
                <AlertTriangle className="size-4" />
              </span>
              <div>
                <div className="text-xs text-muted-foreground">Rejected</div>
                <div className="text-2xl font-semibold tabular-nums">{spoilage?.rejectedCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">{(spoilage?.rejectedWeight ?? 0).toLocaleString()} kg</div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-lg bg-critical/10 p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-critical/15 text-critical">
                <Trash2 className="size-4" />
              </span>
              <div>
                <div className="text-xs text-muted-foreground">Disposed</div>
                <div className="text-2xl font-semibold tabular-nums">{spoilage?.disposedCount ?? 0}</div>
                <div className="text-xs text-muted-foreground">{(spoilage?.disposedWeight ?? 0).toLocaleString()} kg</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
