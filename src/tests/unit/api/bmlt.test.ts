import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// Mock @capacitor/core so tests run in jsdom without a native bridge.
// ---------------------------------------------------------------------------
vi.mock('@capacitor/core', () => ({
  CapacitorHttp: {
    get: vi.fn()
  }
}));

import { CapacitorHttp } from '@capacitor/core';
import { getMeetingsByIds } from '$lib/api/bmlt';

const mockGet = vi.mocked(CapacitorHttp.get);

beforeEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// getMeetingsByIds — URL construction
//
// BMLT requires meeting_ids[] repeated once per id. Passing a comma-joined
// string as a single parameter causes the server to treat it as one literal
// id and silently return only the first match (or nothing).
// ---------------------------------------------------------------------------

describe('getMeetingsByIds', () => {
  it('repeats meeting_ids[] once per id in the request URL', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: [], headers: {}, url: '' });

    await getMeetingsByIds('1,2,3');

    const url: string = mockGet.mock.calls[0][0].url;
    // The URL is built by string concatenation, not URLSearchParams, so [] is
    // not percent-encoded in the parameter name.
    expect(url).toContain('meeting_ids[]=1');
    expect(url).toContain('meeting_ids[]=2');
    expect(url).toContain('meeting_ids[]=3');
    // Must NOT pass a single comma-joined value
    expect(url).not.toContain('meeting_ids[]=1,2,3');
  });

  it('handles a single id', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: [], headers: {}, url: '' });

    await getMeetingsByIds('42');

    const url: string = mockGet.mock.calls[0][0].url;
    expect(url).toContain('meeting_ids[]=42');
  });

  it('trims whitespace from each id', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: [], headers: {}, url: '' });

    await getMeetingsByIds(' 5 , 6 ');

    const url: string = mockGet.mock.calls[0][0].url;
    expect(url).toContain('meeting_ids[]=5');
    expect(url).toContain('meeting_ids[]=6');
    // Spaces must not be in the ids (encodeURIComponent converts them to %20)
    expect(url).not.toContain('meeting_ids[]= ');
  });

  it('filters empty segments from the id string', async () => {
    mockGet.mockResolvedValueOnce({ status: 200, data: [], headers: {}, url: '' });

    await getMeetingsByIds(',7,,8,');

    const url: string = mockGet.mock.calls[0][0].url;
    expect(url).toContain('meeting_ids[]=7');
    expect(url).toContain('meeting_ids[]=8');
  });

  it('returns the parsed meeting array on success', async () => {
    const fakeMeetings = [{ id_bigint: '99', meeting_name: 'Test' }];
    mockGet.mockResolvedValueOnce({ status: 200, data: fakeMeetings, headers: {}, url: '' });

    const result = await getMeetingsByIds('99');
    expect(result).toEqual(fakeMeetings);
  });
});
