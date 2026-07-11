import { apiClient } from "./client";
import type {
  InventoryCrate,
  InventoryCrateDetail,
  ListAllocatableInventoryParams,
  ListInventoryParams,
} from "./types";

export const inventoryApi = {
  list: (params?: ListInventoryParams, signal?: AbortSignal): Promise<InventoryCrate[]> =>
    apiClient.get("/api/inventory", params, signal),
  getById: (crateId: string, signal?: AbortSignal): Promise<InventoryCrateDetail> =>
    apiClient.get(`/api/inventory/${crateId}`, undefined, signal),
  /** Candidate crates (Received/Stored only) for an order/delivery picker. */
  listAllocatable: (params?: ListAllocatableInventoryParams, signal?: AbortSignal): Promise<InventoryCrate[]> =>
    apiClient.get("/api/inventory/allocatable", params, signal),
};
