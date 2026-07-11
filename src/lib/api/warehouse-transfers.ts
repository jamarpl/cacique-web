import { apiClient } from "./client";
import type { CreateWarehouseTransferRequest, ListWarehouseTransfersParams, WarehouseTransfer } from "./types";

export const warehouseTransfersApi = {
  /** At least one of params.crateId / params.warehouseId is required (backend 400s otherwise). */
  list: (params: ListWarehouseTransfersParams, signal?: AbortSignal): Promise<WarehouseTransfer[]> =>
    apiClient.get("/api/warehouse-transfers", params, signal),
  create: (body: CreateWarehouseTransferRequest, signal?: AbortSignal): Promise<WarehouseTransfer> =>
    apiClient.post("/api/warehouse-transfers", body, signal),
};
