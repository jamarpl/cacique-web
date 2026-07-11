import { apiClient } from "./client";
import type {
  AutoModeComparison,
  CreateSimulationRunRequest,
  DispatchPlan,
  SimulationRun,
  WeeklyDispatchPlan,
} from "./types";

/**
 * Spawns/tears down synthetic Buyers/Drivers/Vehicles/Orders for
 * load-testing the Distribution Engine (enginePlan.md) — e.g. "how many
 * deliveries can N drivers complete in a parish". Deleting a run
 * cascade-deletes everything it spawned server-side.
 */
export const simulationApi = {
  listRuns: (signal?: AbortSignal): Promise<SimulationRun[]> =>
    apiClient.get("/api/simulation/runs", undefined, signal),
  createRun: (body: CreateSimulationRunRequest, signal?: AbortSignal): Promise<SimulationRun> =>
    apiClient.post("/api/simulation/runs", body, signal),
  plan: (runId: string, signal?: AbortSignal): Promise<DispatchPlan> =>
    apiClient.post(`/api/simulation/runs/${runId}/plan`, undefined, signal),
  /** automode.md weekly plan — each order's day is chosen per its buyer's actual preferences. */
  planWeek: (runId: string, weekStart?: string, signal?: AbortSignal): Promise<WeeklyDispatchPlan> =>
    apiClient.post(
      `/api/simulation/runs/${runId}/plan/week${weekStart ? `?weekStart=${weekStart}` : ""}`,
      undefined,
      signal,
    ),
  /** automode.md "test" comparison — basic vs smart, forced for every buyer regardless of their own opt-in. */
  compareAutoMode: (runId: string, weekStart?: string, signal?: AbortSignal): Promise<AutoModeComparison> =>
    apiClient.post(
      `/api/simulation/runs/${runId}/plan/week/compare${weekStart ? `?weekStart=${weekStart}` : ""}`,
      undefined,
      signal,
    ),
  deleteRun: (runId: string, signal?: AbortSignal): Promise<void> =>
    apiClient.delete(`/api/simulation/runs/${runId}`, signal),
  deleteAllRuns: (signal?: AbortSignal): Promise<void> => apiClient.delete("/api/simulation/runs", signal),
};
