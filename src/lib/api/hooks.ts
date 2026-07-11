"use client";

import { useCallback, useEffect, useState } from "react";
import { useActingIdentity } from "@/lib/identity/acting-identity-context";
import { ApiError } from "./client";

interface FarmerScopedResourceState<T> {
  data: T | undefined;
  loading: boolean;
  error: ApiError | undefined;
  /** Re-run the fetch without waiting for a dependency to change. */
  refetch: () => void;
}

/**
 * UIRB-FE-4's "threaded into the API client" mechanism made concrete: given
 * a fetcher that accepts the acting farmer's id, this hook resolves that id
 * from `useActingIdentity()`, calls the fetcher, and automatically re-runs
 * whenever the acting farmer changes (e.g. the user switches identity via
 * the header's identity switcher). Every Farmer-wave screen (customers,
 * orders, deliveries, inventory, transfers) can use this instead of each
 * screen hand-wiring farmerId through props/effects itself.
 *
 * When no farmer is currently selected (role isn't "farmer" yet, or
 * mid-switch), `data` stays `undefined` and the fetcher is never called —
 * this specifically avoids firing an unscoped request against endpoints
 * that require farmerId (e.g. GET /api/buyers, which 400s without it).
 */
export function useFarmerScopedResource<T>(
  fetcher: (farmerId: string, signal: AbortSignal) => Promise<T>,
): FarmerScopedResourceState<T> {
  const { farmerId } = useActingIdentity();
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError>();
  const [nonce, setNonce] = useState(0);

  const refetch = useCallback(() => setNonce((n) => n + 1), []);

  // Synchronizes local state with the external fetcher/identity; the
  // early-return branch resets state when scoping becomes invalid (no
  // acting farmer), the rest kicks off (and cleans up) the actual request.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!farmerId) {
      setData(undefined);
      setError(undefined);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setError(undefined);

    fetcher(farmerId, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError) setError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
    /* eslint-enable react-hooks/set-state-in-effect */
    // fetcher is expected to be referentially stable per call site (or
    // wrapped in useCallback by the caller); re-running on farmerId/nonce
    // change is the actual threading behavior this hook exists to provide.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmerId, nonce]);

  return { data, loading, error, refetch };
}
