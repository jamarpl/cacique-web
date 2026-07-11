import { apiClient } from "./client";
import type { CreateIntakeRequest, IntakeResponse } from "./types";

export const intakeApi = {
  create: (body: CreateIntakeRequest, signal?: AbortSignal): Promise<IntakeResponse> =>
    apiClient.post("/api/intake", body, signal),
  getById: (id: string, signal?: AbortSignal): Promise<IntakeResponse> =>
    apiClient.get(`/api/intake/${id}`, undefined, signal),
};
