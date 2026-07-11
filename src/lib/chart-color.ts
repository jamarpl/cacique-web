"use client";

import { useEffect, useState } from "react";

/**
 * UIRB-FE-A1's sequential single-hue ramp, derived from the project's own
 * `--chart-seq-low`/`--chart-seq-high` CSS custom properties (globals.css)
 * rather than arbitrary hardcoded hex — per the requirements doc's explicit
 * "light = low, dark = high" magnitude convention. These are a dedicated
 * pair (not `--chart-1`/`--chart-5`, which are now distinct categorical
 * hues) so the sequential ramp always stays a single hue, light-to-dark, per
 * the data-viz "sequential = one hue" rule.
 */

interface RgbColor {
  r: number;
  g: number;
  b: number;
}

const FALLBACK_LOW: RgbColor = { r: 0xb7, g: 0xd3, b: 0xf6 };
const FALLBACK_HIGH: RgbColor = { r: 0x0d, g: 0x36, b: 0x6b };

function parseHex(raw: string): RgbColor | null {
  const match = raw.trim().match(/^#?([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = match[1];
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function toHexString(color: RgbColor): string {
  const channel = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0");
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`;
}

/**
 * Returns a `colorFor(t)` function (t in [0, 1], clamped) that interpolates
 * along the `--chart-seq-low` (t=0, light) -> `--chart-seq-high` (t=1, dark)
 * ramp read live from the current theme's computed styles. Falls back to
 * this theme's known values (matching globals.css) until the client-side
 * read completes, so server-rendered/first-paint output is still
 * deterministic.
 */
export function useSequentialChartRamp(): (t: number) => string {
  const [endpoints, setEndpoints] = useState<{ low: RgbColor; high: RgbColor }>({
    low: FALLBACK_LOW,
    high: FALLBACK_HIGH,
  });

  // Reads a live CSS custom property from an external system (the DOM/theme)
  // on mount — the canonical "synchronize from an external system" effect
  // use case, not mirroring already-available render-time state.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const styles = getComputedStyle(document.documentElement);
    const low = parseHex(styles.getPropertyValue("--chart-seq-low"));
    const high = parseHex(styles.getPropertyValue("--chart-seq-high"));
    if (low && high) {
      setEndpoints({ low, high });
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  return (t: number) => {
    const clamped = Math.max(0, Math.min(1, Number.isFinite(t) ? t : 0));
    return toHexString({
      r: lerp(endpoints.low.r, endpoints.high.r, clamped),
      g: lerp(endpoints.low.g, endpoints.high.g, clamped),
      b: lerp(endpoints.low.b, endpoints.high.b, clamped),
    });
  };
}
