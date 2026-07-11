import { apiClient } from "./client";
import type { CreateOrderRequest, ListOrdersParams, Order, OrderDetail, OrderSummary, UpdateOrderRequest } from "./types";

export const ordersApi = {
  list: (params?: ListOrdersParams, signal?: AbortSignal): Promise<OrderSummary[]> =>
    apiClient.get("/api/orders", params, signal),
  create: (body: CreateOrderRequest, signal?: AbortSignal): Promise<Order> =>
    apiClient.post("/api/orders", body, signal),
  getById: (id: string, signal?: AbortSignal): Promise<OrderDetail> =>
    apiClient.get(`/api/orders/${id}`, undefined, signal),
  update: (id: string, body: UpdateOrderRequest, signal?: AbortSignal): Promise<Order> =>
    apiClient.put(`/api/orders/${id}`, body, signal),
};
