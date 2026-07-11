import { apiClient } from "./client";
import type {
  CreateDeliveryRequest,
  Delivery,
  DeliverySummary,
  ListDeliveriesParams,
  UpdateDeliveryRequest,
} from "./types";

export const deliveriesApi = {
  /**
   * All filters optional; `farmerId` scopes to a single farmer (UIRB-BACK-2),
   * `thisWeek` XOR `fromDate`/`toDate` scopes by DepartureTime.
   */
  list: (params?: ListDeliveriesParams, signal?: AbortSignal): Promise<DeliverySummary[]> =>
    apiClient.get("/api/deliveries", params, signal),
  create: (body: CreateDeliveryRequest, signal?: AbortSignal): Promise<Delivery> =>
    apiClient.post("/api/deliveries", body, signal),
  getById: (id: string, signal?: AbortSignal): Promise<Delivery> =>
    apiClient.get(`/api/deliveries/${id}`, undefined, signal),
  updateStatus: (id: string, body: UpdateDeliveryRequest, signal?: AbortSignal): Promise<Delivery> =>
    apiClient.patch(`/api/deliveries/${id}`, body, signal),
};
