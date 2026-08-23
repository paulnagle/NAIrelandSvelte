import { CapacitorHttp } from '@capacitor/core';

/**
 * Typed error thrown when an HTTP request returns a non-200 status.
 * A failed request must never silently look like an empty result.
 */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string
  ) {
    super(`HTTP ${status} from ${url}`);
    this.name = 'ApiError';
  }
}

/**
 * Single HTTP GET wrapper around CapacitorHttp.
 *
 * Handles two BMLT wire quirks:
 *   1. Empty result sets arrive as `{}` rather than `[]` — normalised to `[]`.
 *   2. Response body sometimes arrives as an unparsed string — parsed as JSON.
 *
 * Throws ApiError on any non-200 status. Never returns [] on failure.
 */
export async function httpGet<T>(url: string): Promise<T> {
  const response = await CapacitorHttp.get({ url });

  if (response.status !== 200) {
    throw new ApiError(response.status, url);
  }

  // Parse string bodies
  let data: unknown = response.data;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      throw new ApiError(200, url);
    }
  }

  // Normalise empty-object BMLT response ({}) to empty array
  if (data !== null && typeof data === 'object' && !Array.isArray(data) && Object.keys(data as object).length === 0) {
    return [] as unknown as T;
  }

  return data as T;
}

/**
 * HTTP GET that returns the raw response body as a string, without any
 * JSON parsing. Used for endpoints that return non-JSON content (e.g. HTML).
 *
 * Throws ApiError on any non-200 status.
 */
export async function httpGetText(url: string): Promise<string> {
  const response = await CapacitorHttp.get({ url });

  if (response.status !== 200) {
    throw new ApiError(response.status, url);
  }

  return typeof response.data === 'string' ? response.data : String(response.data);
}
