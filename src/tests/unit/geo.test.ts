import { describe, it, expect } from 'vitest';
import { distanceKm, coordinateKey, isValidLatLng } from '$lib/geo';

// ---------------------------------------------------------------------------
// distanceKm
// ---------------------------------------------------------------------------

describe('distanceKm', () => {
  it('returns 0 for identical points', () => {
    expect(distanceKm({ lat: 53.3498, lng: -6.2603 }, { lat: 53.3498, lng: -6.2603 })).toBe(0);
  });

  it('calculates the known distance between Dublin and Cork (~220 km)', () => {
    // Dublin: 53.3498°N, 6.2603°W  Cork: 51.8985°N, 8.4756°W
    const km = distanceKm({ lat: 53.3498, lng: -6.2603 }, { lat: 51.8985, lng: -8.4756 });
    // Haversine should be within 1 km of the accepted geodesic (~219 km)
    expect(km).toBeGreaterThan(218);
    expect(km).toBeLessThan(222);
  });

  it('calculates the known distance between Dublin and Galway (~186 km)', () => {
    // Galway: 53.2707°N, 9.0568°W
    const km = distanceKm({ lat: 53.3498, lng: -6.2603 }, { lat: 53.2707, lng: -9.0568 });
    expect(km).toBeGreaterThan(183);
    expect(km).toBeLessThan(189);
  });

  it('is symmetric — distance A→B equals B→A', () => {
    const a = { lat: 53.3498, lng: -6.2603 };
    const b = { lat: 51.8985, lng: -8.4756 };
    expect(distanceKm(a, b)).toBeCloseTo(distanceKm(b, a), 6);
  });
});

// ---------------------------------------------------------------------------
// coordinateKey
// ---------------------------------------------------------------------------

describe('coordinateKey', () => {
  it('rounds to 3 decimal places', () => {
    expect(coordinateKey(53.34985, -6.26031)).toBe('53.350,-6.260');
  });

  it('returns the same key for two points within ~110 m of each other', () => {
    // Two points that differ only after the 3rd decimal place
    expect(coordinateKey(53.3498, -6.2603)).toBe(coordinateKey(53.34984, -6.26034));
  });

  it('returns different keys for points >110 m apart', () => {
    // 0.001 degrees latitude ≈ 111 m
    expect(coordinateKey(53.349, -6.2603)).not.toBe(coordinateKey(53.35, -6.2603));
  });

  it('formats as "lat,lng"', () => {
    const key = coordinateKey(53.0, -8.0);
    expect(key).toBe('53.000,-8.000');
  });
});

// ---------------------------------------------------------------------------
// isValidLatLng
// ---------------------------------------------------------------------------

describe('isValidLatLng', () => {
  it('returns true for a valid point', () => {
    expect(isValidLatLng({ lat: 53.3498, lng: -6.2603 })).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidLatLng(null)).toBe(false);
  });

  it('returns false for undefined', () => {
    expect(isValidLatLng(undefined)).toBe(false);
  });

  it('returns false when lat is NaN', () => {
    expect(isValidLatLng({ lat: NaN, lng: -6.2603 })).toBe(false);
  });

  it('returns false when lat exceeds 90', () => {
    expect(isValidLatLng({ lat: 91, lng: 0 })).toBe(false);
  });

  it('returns false when lng exceeds 180', () => {
    expect(isValidLatLng({ lat: 0, lng: 181 })).toBe(false);
  });

  it('accepts boundary values (lat=90, lng=180)', () => {
    expect(isValidLatLng({ lat: 90, lng: 180 })).toBe(true);
  });

  it('returns false when lat is missing', () => {
    expect(isValidLatLng({ lng: -6.2603 })).toBe(false);
  });
});
