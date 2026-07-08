import { GOOGLE_MAPS_API_KEY } from '../../utils/googleEnv.js';
import { googlePlaceCache } from './placeCache.js';


export type ReverseGeocodeResult = {
  place_name: string | null;

  formatted_address: string | null;
  place_id: string | null;
  latitude: number;
  longitude: number;
} | null;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function roundCoord(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// Default to 5 decimals (~1.1m) to significantly dedupe while staying accurate.
function cacheKey(latitude: number, longitude: number): string {
  const lat = roundCoord(latitude, 5);
  const lng = roundCoord(longitude, 5);
  return `${lat},${lng}`;
}

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const resp = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return resp;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Google Reverse Geocoding via Geocoding API:
 * https://developers.google.com/maps/documentation/geocoding/start
 */
export async function resolveReverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const apiKey = GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return {
      place_name: null,
      formatted_address: null,
      place_id: null,
      latitude,
      longitude,
    };
  }

  const key = cacheKey(latitude, longitude);
  const cached = googlePlaceCache.get(key);
  if (cached) return cached;

  const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
  url.searchParams.set('latlng', `${latitude},${longitude}`);
  url.searchParams.set('key', apiKey);
  // Request a broad set of result types so outdoor/street/neighborhood locations
  // still get a meaningful name instead of falling back to raw coordinates.
  url.searchParams.set(
    'result_type',
    'street_address|route|intersection|neighborhood|sublocality|locality|establishment|point_of_interest|premise|subpremise|park|natural_feature'
  );

  // Basic retry for transient errors and rate-limits.
  // Must be graceful: never throw.
  const timeoutMs = 3500;
  const maxAttempts = 2;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const resp = await fetchWithTimeout(url.toString(), { method: 'GET' }, timeoutMs);
      const status = resp.status;

      if (!resp.ok) {
        // Retry only on rate limit / transient.
        if ((status === 429 || status >= 500) && attempt < maxAttempts) {
          // Exponential backoff with jitter.
          await sleep(200 * attempt + Math.random() * 100);
          continue;
        }

        googlePlaceCache.set(key, {
          place_name: null,
          formatted_address: null,
          place_id: null,
          latitude,
          longitude,
        });
        return googlePlaceCache.get(key) || null;
      }

      const data: any = await resp.json();

      const apiStatus = data?.status;
      if (apiStatus !== 'OK') {
        // RATE_LIMIT / OVER_QUERY_LIMIT / ZERO_RESULTS / REQUEST_DENIED ...
        // Always cache null-ish result to dedupe repeated failures.
        googlePlaceCache.set(key, {
          place_name: null,
          formatted_address: null,
          place_id: null,
          latitude,
          longitude,
        });
        return googlePlaceCache.get(key) || null;
      }

      const first = data?.results?.[0];
      const formatted_address = first?.formatted_address ?? null;
      const place_id = first?.place_id ?? null;

      // Prefer a human-readable establishment/point-of-interest name, then a route/neighborhood,
      // then the first address component so we never return raw coordinates to the UI.
      const components = first?.address_components ?? [];
      const establishment = components.find((c: any) =>
        c.types?.includes('establishment') || c.types?.includes('point_of_interest')
      )?.long_name;
      const route = components.find((c: any) => c.types?.includes('route'))?.long_name;
      const neighborhood = components.find((c: any) =>
        c.types?.includes('neighborhood') || c.types?.includes('sublocality')
      )?.long_name;
      const locality = components.find((c: any) =>
        c.types?.includes('locality') || c.types?.includes('administrative_area_level_2')
      )?.long_name;
      const place_name = establishment || neighborhood || route || locality || formatted_address || null;

      const result: ReverseGeocodeResult = {
        place_name: place_name ?? null,
        formatted_address: formatted_address ?? null,
        place_id: place_id ?? null,
        latitude,
        longitude,
      };

      googlePlaceCache.set(key, result);
      return result;
    } catch {
      if (attempt < maxAttempts) {
        await sleep(150 * attempt + Math.random() * 100);
        continue;
      }

      googlePlaceCache.set(key, {
        place_name: null,
        formatted_address: null,
        place_id: null,
        latitude,
        longitude,
      });
      return googlePlaceCache.get(key) || null;
    }
  }

  return null;
}

