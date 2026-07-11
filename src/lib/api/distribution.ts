import { apiClient } from "./client";
import type { DispatchPlan, WeeklyDispatchPlan } from "./types";

/**
 * Runs the Distribution Engine (enginePlan.md) against the real
 * (non-simulated) fleet and order book. Dry-run only — never mutates
 * Delivery/WarehouseTransfer rows.
 */
export const distributionApi = {
  getPlan: (parish?: string, signal?: AbortSignal): Promise<DispatchPlan> =>
    apiClient.get("/api/distribution/plan", parish ? { parish } : undefined, signal),
  /** automode.md weekly plan for the real fleet/order book. */
  getWeeklyPlan: (parish?: string, weekStart?: string, signal?: AbortSignal): Promise<WeeklyDispatchPlan> =>
    apiClient.get(
      "/api/distribution/plan/week",
      { ...(parish ? { parish } : {}), ...(weekStart ? { weekStart } : {}) },
      signal,
    ),
};
