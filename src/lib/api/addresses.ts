import { apiClient } from "./client";
import type { RandomAddress } from "./types";

/**
 * Generates genuinely real Jamaican addresses by reverse-geocoding random
 * points within a parish — not fabricated text (which wouldn't actually
 * resolve to anywhere). Requires a Mapbox token configured server-side.
 */
export const addressesApi = {
  random: (parish: string, count: number, signal?: AbortSignal): Promise<RandomAddress[]> =>
    apiClient.get("/api/addresses/random", { parish, count }, signal),
};
