import { toast } from "sonner";

/**
 * Base URL for the Cacique.Api REST surface, read from
 * NEXT_PUBLIC_API_BASE_URL (see .env.example). Left empty (relative fetches)
 * if unset, which will fail loudly against a live backend rather than
 * silently hitting the wrong host.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/**
 * Shared secret for the backend's minimal ApiKeyGateMiddleware (Auth:ApiKey)
 * — not real per-user auth, just a "stop randoms" gate. Empty in local dev
 * (backend no-ops when Auth:ApiKey is unset), so this header is a no-op too.
 * Set NEXT_PUBLIC_API_KEY to match the backend's Auth__ApiKey in any real
 * deployment.
 */
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

/**
 * Thrown for any non-2xx response or network failure. Carries the parsed
 * error body (ASP.NET Core's ValidationProblem/ProblemDetails shape, when
 * present) so callers can inspect field-level errors if needed, beyond the
 * toast already shown by the client.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

function buildQueryString(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === null || value === undefined || value === "") continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Extracts a human-readable message from an ASP.NET Core ProblemDetails /
 * ValidationProblem response body, e.g.
 * `{ title: "...", errors: { farmerId: ["farmerId query parameter is required."] } }`.
 * Falls back to `detail` (plain ProblemDetails) if present, else undefined.
 */
function extractErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const obj = body as Record<string, unknown>;

  if (obj.errors && typeof obj.errors === "object") {
    const errors = obj.errors as Record<string, unknown>;
    const firstField = Object.values(errors)[0];
    if (Array.isArray(firstField) && firstField.length > 0) {
      const title = typeof obj.title === "string" ? obj.title : "Validation error";
      return `${title}: ${String(firstField[0])}`;
    }
  }

  if (typeof obj.title === "string") return obj.title;
  if (typeof obj.detail === "string") return obj.detail;
  return undefined;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
  /** Suppress the automatic error toast (caller handles its own messaging). */
  silent?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, signal, silent } = options;
  const url = `${API_BASE_URL}${path}${buildQueryString(query)}`;

  let response: Response;
  try {
    const headers: Record<string, string> = {};
    if (body !== undefined) headers["Content-Type"] = "application/json";
    if (API_KEY) headers["X-Api-Key"] = API_KEY;

    response = await fetch(url, {
      method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (networkError) {
    // AbortError happens on intentional cancellation (e.g. component
    // unmount) — never surface that as a user-facing error toast.
    if (networkError instanceof DOMException && networkError.name === "AbortError") {
      throw networkError;
    }
    const message = "Could not reach the Cacique API. Check your connection or NEXT_PUBLIC_API_BASE_URL.";
    if (!silent) toast.error(message);
    throw new ApiError(message, 0, networkError);
  }

  if (!response.ok) {
    let details: unknown;
    let message = `Request failed (${response.status} ${response.statusText})`;
    try {
      details = await response.json();
      message = extractErrorMessage(details) ?? message;
    } catch {
      // No JSON body (or not JSON) — keep the generic status-based message.
    }
    if (!silent) toast.error(message);
    throw new ApiError(message, response.status, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const apiClient = {
  // `P extends object` (not `P extends QueryParams`) is deliberate: named
  // interfaces (e.g. ListBuyersParams) never structurally satisfy a type
  // with an explicit string index signature in TS, even when every
  // property's value type would already be a valid QueryValue — this is a
  // standing TS limitation for interfaces (fresh object literals get an
  // assignability exception; named interface/type references don't). The
  // internal cast below is the one place that bridges the two; every
  // resource module's params type is still fully checked against its own
  // declared shape at its call site.
  get: <T, P extends object = QueryParams>(path: string, query?: P, signal?: AbortSignal) =>
    request<T>(path, { method: "GET", query: query as QueryParams | undefined, signal }),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "POST", body, signal }),
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "PUT", body, signal }),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, { method: "PATCH", body, signal }),
  delete: <T>(path: string, signal?: AbortSignal) => request<T>(path, { method: "DELETE", signal }),
};
