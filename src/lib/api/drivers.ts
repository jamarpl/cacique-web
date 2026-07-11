import { apiClient } from "./client";
import type { CreateDriverRequest, Driver } from "./types";

export const driversApi = {
  list: (signal?: AbortSignal): Promise<Driver[]> => apiClient.get("/api/drivers", undefined, signal),
  create: (body: CreateDriverRequest, signal?: AbortSignal): Promise<Driver> =>
    apiClient.post("/api/drivers", body, signal),
};
