"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DispatchPlanDetail, Stat } from "./dispatch-plan-detail";
import type { DailyPlanSummary, WeeklyDispatchPlan } from "@/lib/api";

/**
 * automode.md weekly view: a stat row for the whole week, then one summary
 * card per day — click a day to drill into its full daily dispatch plan
 * (map, trips, unfulfilled orders) in a dialog, reusing the exact same
 * detail view the single-day plan already uses.
 */
export function WeekSummary({ plan, title }: { plan: WeeklyDispatchPlan; title?: string }) {
  const [selectedDay, setSelectedDay] = useState<DailyPlanSummary | null>(null);

  return (
    <div className="space-y-4">
      {title && <h3 className="text-sm font-semibold">{title}</h3>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Total orders" value={plan.totalOrders} />
        <Stat label="Delivered" value={plan.deliveredOrders} />
        <Stat label="Unfulfilled" value={plan.unfulfilledOrdersCount} />
        <Stat label="Total km" value={plan.totalDistanceKm.toFixed(1)} />
        <Stat label="Deliveries / km" value={plan.deliveriesPerKm.toFixed(2)} />
        <Stat label="Days used" value={plan.distinctDeliveryDaysUsed} />
      </div>

      {plan.unschedulableOrders.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {plan.unschedulableOrders.length} order{plan.unschedulableOrders.length === 1 ? "" : "s"} couldn&apos;t be
          placed on any day this week (flexibility/blackout/weekly-cap conflict).
        </p>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {plan.days.map((day) => (
          <button
            key={day.date}
            type="button"
            onClick={() => setSelectedDay(day)}
            className="rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium">{day.dayOfWeek}</span>
              <Badge variant={day.deliveredOrders > 0 ? "default" : "outline"}>{day.deliveredOrders} del.</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{day.date}</p>
            <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
              <p>
                {day.totalOrders} order{day.totalOrders === 1 ? "" : "s"} · {day.unfulfilledOrdersCount} unfulfilled
              </p>
              <p>{day.totalDistanceKm.toFixed(1)} km</p>
            </div>
          </button>
        ))}
      </div>

      <Dialog open={selectedDay !== null} onOpenChange={(open) => !open && setSelectedDay(null)}>
        <DialogContent className="max-h-[90vh] w-full sm:max-w-6xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedDay?.dayOfWeek}, {selectedDay?.date}
            </DialogTitle>
            <DialogDescription>Dry-run output from the Distribution Engine for this day.</DialogDescription>
          </DialogHeader>
          {selectedDay && <DispatchPlanDetail plan={selectedDay.plan} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
