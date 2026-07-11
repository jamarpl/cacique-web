import { apiClient } from "./client";
import type {
  DeliveryPerformance,
  IntakeTrendEntry,
  InventorySummary,
  RegionalProductionEntry,
  SpoilageResponse,
  WarehouseUtilizationEntry,
} from "./types";

/** Read-only aggregation endpoints backing the Analytics screen (ported as-is per the plan). */
export const analyticsApi = {
  getInventorySummary: (signal?: AbortSignal): Promise<InventorySummary> =>
    apiClient.get("/api/analytics/inventory-summary", undefined, signal),
  getRegionalProduction: (signal?: AbortSignal): Promise<RegionalProductionEntry[]> =>
    apiClient.get("/api/analytics/regional-production", undefined, signal),
  getWarehouseUtilization: (signal?: AbortSignal): Promise<WarehouseUtilizationEntry[]> =>
    apiClient.get("/api/analytics/warehouse-utilization", undefined, signal),
  getDeliveryPerformance: (signal?: AbortSignal): Promise<DeliveryPerformance> =>
    apiClient.get("/api/analytics/delivery-performance", undefined, signal),
  getSpoilage: (signal?: AbortSignal): Promise<SpoilageResponse> =>
    apiClient.get("/api/analytics/spoilage", undefined, signal),
  getIntakeTrend: (weeks?: number, signal?: AbortSignal): Promise<IntakeTrendEntry[]> =>
    apiClient.get("/api/analytics/intake-trend", weeks ? { weeks } : undefined, signal),
};
