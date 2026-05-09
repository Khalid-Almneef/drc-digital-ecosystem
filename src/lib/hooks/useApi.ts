"use client";

import useSWR, { type SWRConfiguration } from "swr";
import { apiFetch, type ApiError } from "@/lib/client";

/**
 * SWR-backed reader for the DRC API. Pass `null` to skip the request
 * (mirrors SWR's conditional-fetching convention).
 *
 * Returns the canonical SWR shape so callers can opt into mutate/isValidating
 * without paying for them.
 *
 * - 401s redirect to /login (handled inside `apiFetch`).
 * - Default revalidation is on focus and reconnect; opt out per-call when needed
 *   (e.g. dashboard summaries that we don't want flickering during editing).
 */
export function useApi<T>(
  key: string | null,
  config?: SWRConfiguration<T, ApiError>,
) {
  const fetcher = (path: string) => apiFetch<T>(path);
  return useSWR<T, ApiError>(key, fetcher, {
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
    ...config,
  });
}
