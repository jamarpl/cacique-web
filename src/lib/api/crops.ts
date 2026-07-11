import { apiClient } from "./client";
import type { Crop, ListCropsParams } from "./types";

/** Read-only crop catalog (seed data). */
export const cropsApi = {
  list: (params?: ListCropsParams, signal?: AbortSignal): Promise<Crop[]> =>
    apiClient.get("/api/crops", params, signal),
};
