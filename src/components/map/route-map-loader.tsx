"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";
import type { RouteMapProps } from "./route-map";

/**
 * Leaflet touches `window` at import time, so it can't be part of the
 * server-rendered bundle — this wraps RouteMap in a client-only dynamic
 * import (ssr: false) so consuming pages don't each need to repeat that
 * boilerplate.
 */
const RouteMap = dynamic(() => import("./route-map"), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-lg" />,
});

export default function RouteMapLoader(props: RouteMapProps) {
  return <RouteMap {...props} />;
}
