"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

/**
 * Client-side "acting as X" stand-in for the old Blazor Server
 * `FarmerSessionState`, per UIRB-FE-4. This is explicitly NOT a security
 * boundary — there is no authentication in this epic (TODO(auth), same
 * standing posture as the rest of the codebase). It exists purely so the UI
 * knows which role/farmer/driver to scope its API calls to.
 *
 * Persisted to localStorage so the selection survives reloads.
 */

export type ActingRole = "farmer" | "admin" | "driver";

const STORAGE_KEY = "cacique.actingIdentity.v1";

interface StoredIdentity {
  role: ActingRole | null;
  farmerId: string | null;
  farmerName: string | null;
  driverId: string | null;
  driverName: string | null;
}

interface ActingIdentityContextValue {
  role: ActingRole | null;
  /** Only meaningful when role === "farmer". */
  farmerId: string | null;
  /** Display name for the acting farmer, cached alongside the id for UI use. */
  farmerName: string | null;
  /** Only meaningful when role === "driver". */
  driverId: string | null;
  /** Display name for the acting driver, cached alongside the id for UI use. */
  driverName: string | null;
  /** True once the persisted value (if any) has been read from localStorage. */
  isHydrated: boolean;
  /** Sets the acting role. Switching to a different role clears the other roles' selections. */
  setRole: (role: ActingRole | null) => void;
  /** Sets the acting farmer (only meaningful once role === "farmer"). */
  setFarmer: (farmerId: string | null, farmerName?: string | null) => void;
  /** Sets the acting driver (only meaningful once role === "driver"). */
  setDriver: (driverId: string | null, driverName?: string | null) => void;
  /** Clears the whole identity, returning the app to the role-selection landing page. */
  clear: () => void;
}

const ActingIdentityContext = createContext<ActingIdentityContextValue | undefined>(undefined);

function readStoredIdentity(): StoredIdentity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredIdentity>;
    return {
      role: parsed.role === "farmer" || parsed.role === "admin" || parsed.role === "driver" ? parsed.role : null,
      farmerId: typeof parsed.farmerId === "string" ? parsed.farmerId : null,
      farmerName: typeof parsed.farmerName === "string" ? parsed.farmerName : null,
      driverId: typeof parsed.driverId === "string" ? parsed.driverId : null,
      driverName: typeof parsed.driverName === "string" ? parsed.driverName : null,
    };
  } catch {
    return null;
  }
}

export function ActingIdentityProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<ActingRole | null>(null);
  const [farmerId, setFarmerIdState] = useState<string | null>(null);
  const [farmerName, setFarmerNameState] = useState<string | null>(null);
  const [driverId, setDriverIdState] = useState<string | null>(null);
  const [driverName, setDriverNameState] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read the persisted value once on mount (client-only — localStorage
  // doesn't exist during SSR/RSC render). This is the canonical
  // "synchronize from an external system on mount" effect use case; the
  // lint rule below is tuned for effects that merely mirror
  // already-available render-time state, which isn't the case here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = readStoredIdentity();
    if (stored) {
      setRoleState(stored.role);
      setFarmerIdState(stored.farmerId);
      setFarmerNameState(stored.farmerName);
      setDriverIdState(stored.driverId);
      setDriverNameState(stored.driverName);
    }
    setIsHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Persist on every change, once hydrated (avoid clobbering storage with
  // the initial null state before the read above has run).
  useEffect(() => {
    if (!isHydrated) return;
    const value: StoredIdentity = { role, farmerId, farmerName, driverId, driverName };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }, [role, farmerId, farmerName, driverId, driverName, isHydrated]);

  const setRole = useCallback((nextRole: ActingRole | null) => {
    setRoleState(nextRole);
    if (nextRole !== "farmer") {
      setFarmerIdState(null);
      setFarmerNameState(null);
    }
    if (nextRole !== "driver") {
      setDriverIdState(null);
      setDriverNameState(null);
    }
  }, []);

  const setFarmer = useCallback((nextFarmerId: string | null, nextFarmerName?: string | null) => {
    setFarmerIdState(nextFarmerId);
    setFarmerNameState(nextFarmerName ?? null);
  }, []);

  const setDriver = useCallback((nextDriverId: string | null, nextDriverName?: string | null) => {
    setDriverIdState(nextDriverId);
    setDriverNameState(nextDriverName ?? null);
  }, []);

  const clear = useCallback(() => {
    setRoleState(null);
    setFarmerIdState(null);
    setFarmerNameState(null);
    setDriverIdState(null);
    setDriverNameState(null);
  }, []);

  const value = useMemo<ActingIdentityContextValue>(
    () => ({ role, farmerId, farmerName, driverId, driverName, isHydrated, setRole, setFarmer, setDriver, clear }),
    [role, farmerId, farmerName, driverId, driverName, isHydrated, setRole, setFarmer, setDriver, clear],
  );

  return <ActingIdentityContext.Provider value={value}>{children}</ActingIdentityContext.Provider>;
}

export function useActingIdentity(): ActingIdentityContextValue {
  const ctx = useContext(ActingIdentityContext);
  if (!ctx) {
    throw new Error("useActingIdentity must be used within <ActingIdentityProvider>.");
  }
  return ctx;
}
