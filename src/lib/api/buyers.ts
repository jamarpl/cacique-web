import { apiClient } from "./client";
import type { Buyer, CreateBuyerRequest, ListBuyersParams, UpdateBuyerPreferencesRequest } from "./types";

/**
 * Buyers are farmer-local (BUYER-1) — `farmerId` is a required query param
 * on list, not optional, and enforced server-side (400 if omitted). Always
 * pass the acting farmer's id; see `useActingIdentity()` /
 * `useFarmerScopedResource()`.
 */
export const buyersApi = {
  list: (params: ListBuyersParams, signal?: AbortSignal): Promise<Buyer[]> =>
    apiClient.get("/api/buyers", params, signal),
  create: (body: CreateBuyerRequest, signal?: AbortSignal): Promise<Buyer> =>
    apiClient.post("/api/buyers", body, signal),
  getById: (id: string, signal?: AbortSignal): Promise<Buyer> =>
    apiClient.get(`/api/buyers/${id}`, undefined, signal),
  updatePreferences: (id: string, body: UpdateBuyerPreferencesRequest, signal?: AbortSignal): Promise<Buyer> =>
    apiClient.put(`/api/buyers/${id}/preferences`, body, signal),
};
