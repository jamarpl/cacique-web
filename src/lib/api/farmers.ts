import { apiClient } from "./client";
import type { CreateFarmerRequest, Farmer } from "./types";

/** GET/POST /api/farmers. No GET/{id}, PUT, or DELETE — deferred backend-side. */
export const farmersApi = {
  list: (signal?: AbortSignal): Promise<Farmer[]> => apiClient.get("/api/farmers", undefined, signal),
  create: (body: CreateFarmerRequest, signal?: AbortSignal): Promise<Farmer> =>
    apiClient.post("/api/farmers", body, signal),
};
