import { describe, it, expect, vi, beforeEach } from 'vitest';
import { httpGet, ApiError } from '$lib/api/http';

// ---------------------------------------------------------------------------
// Mock @capacitor/core so tests run in jsdom without a native bridge.
// ---------------------------------------------------------------------------
vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    get: vi.fn()
  }
}));

import { CapacitorHttp } from '@capacitor/core';
const mockGet = vi.mocked(CapacitorHttp.get);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('httpGet', () => {
  it('returns parsed array when body is a normal JSON array', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: [{ id: '1' }], headers: {}, url: 'https://example.com' });

    const result = await httpGet<{ id: string }[]>('https://example.com');
    expect(result).toEqual([{ id: '1' }]);
  });

  it('normalises {} response body to []', async () => {
    // BMLT returns {} for empty result sets instead of [].
    // This must silently become [] — not throw, not return a useless object.
    mockGet.mockResolvedValueOnce({ status: 200, data: {}, headers: {}, url: 'https://example.com' });

    const result = await httpGet<unknown[]>('https://example.com');
    expect(result).toEqual([]);
  });

  it('parses a string body as JSON', async () => {
    // Some environments deliver the body as an unparsed string.
    mockGet.mockResolvedValueOnce({
      status: 200,
      data: '[{"id":"2"}]',
      headers: {},
      url: 'https://example.com'
    });

    const result = await httpGet<{ id: string }[]>('https://example.com');
    expect(result).toEqual([{ id: '2' }]);
  });

  it('parses a string {} body as []', async () => {
    mockGet.mockResolvedValueOnce({
      status: 200,
      data: '{}',
      headers: {},
      url: 'https://example.com'
    });

    const result = await httpGet<unknown[]>('https://example.com');
    expect(result).toEqual([]);
  });

  it('throws ApiError on non-200 status — never returns []', async () => {
    mockGet.mockResolvedValueOnce({ status: 500, data: null, headers: {}, url: 'https://example.com' });

    await expect(httpGet('https://example.com')).rejects.toBeInstanceOf(ApiError);
  });

  it('ApiError carries the status code and url', async () => {
    mockGet.mockResolvedValueOnce({
      status: 404,
      data: null,
      headers: {},
      url: 'https://example.com/missing'
    });

    let thrown: ApiError | undefined;
    try {
      await httpGet('https://example.com/missing');
    } catch (e) {
      thrown = e as ApiError;
    }

    expect(thrown).toBeDefined();
    expect(thrown!.status).toBe(404);
    expect(thrown!.url).toBe('https://example.com/missing');
  });

  it('does NOT catch ApiError and return [] — the error propagates', async () => {
    mockGet.mockResolvedValueOnce({ status: 503, data: null, headers: {}, url: 'https://example.com' });

    // The promise must reject, not resolve to anything
    const result = httpGet('https://example.com');
    await expect(result).rejects.toThrow('HTTP 503');
  });
});
