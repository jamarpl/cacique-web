import { apiClient } from "./client";
import type { CreateVehicleRequest, Vehicle } from "./types";

export const vehiclesApi = {
  list: (signal?: AbortSignal): Promise<Vehicle[]> => apiClient.get("/api/vehicles", undefined, signal),
  create: (body: CreateVehicleRequest, signal?: AbortSignal): Promise<Vehicle> =>
    apiClient.post("/api/vehicles", body, signal),
};
