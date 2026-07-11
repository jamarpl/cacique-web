import { apiClient } from "./client";
import type {
  CreateWarehouseRequest,
  ListWarehousesParams,
  UpdateWarehouseCropsRequest,
  UpdateWarehouseRequest,
  UpdateWarehouseStatusRequest,
  Warehouse,
  WarehouseCrop,
} from "./types";

export const warehousesApi = {
  list: (params?: ListWarehousesParams, signal?: AbortSignal): Promise<Warehouse[]> =>
    apiClient.get("/api/warehouses", params, signal),
  create: (body: CreateWarehouseRequest, signal?: AbortSignal): Promise<Warehouse> =>
    apiClient.post("/api/warehouses", body, signal),
  update: (id: string, body: UpdateWarehouseRequest, signal?: AbortSignal): Promise<Warehouse> =>
    apiClient.put(`/api/warehouses/${id}`, body, signal),
  updateStatus: (id: string, body: UpdateWarehouseStatusRequest, signal?: AbortSignal): Promise<Warehouse> =>
    apiClient.patch(`/api/warehouses/${id}/status`, body, signal),
  getCrops: (id: string, signal?: AbortSignal): Promise<WarehouseCrop[]> =>
    apiClient.get(`/api/warehouses/${id}/crops`, undefined, signal),
  updateCrops: (id: string, body: UpdateWarehouseCropsRequest, signal?: AbortSignal): Promise<WarehouseCrop[]> =>
    apiClient.put(`/api/warehouses/${id}/crops`, body, signal),
};
