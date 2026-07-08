import { pool } from '../db.js';
import { resolveReverseGeocode } from './google/reverseGeocodeService.js';

export type ResolvedLocation = {
  place_name: string | null;
  formatted_address: string | null;
  google_place_id: string | null;
};

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

function haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const rLat1 = toRadians(lat1);
  const rLat2 = toRadians(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(rLat1) * Math.cos(rLat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export async function resolveLocation(latitude: number, longitude: number): Promise<ResolvedLocation> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      place_name: null,
      formatted_address: null,
      google_place_id: null,
    };
  }

  const campusPlacesResult = await pool.query(
    `
      SELECT id, name, latitude, longitude, radius_meters
      FROM hotspot_places
      WHERE latitude BETWEEN $1 AND $2
        AND longitude BETWEEN $3 AND $4
    `,
    [
      latitude - 0.01,
      latitude + 0.01,
      longitude - 0.01,
      longitude + 0.01,
    ]
  );

  let nearestPlace: { name: string; distance: number } | null = null;
  for (const row of campusPlacesResult.rows) {
    const distance = haversineDistanceMeters(
      latitude,
      longitude,
      Number(row.latitude),
      Number(row.longitude)
    );
    const radius = Number(row.radius_meters) || 0;
    if (distance <= radius) {
      if (!nearestPlace || distance < nearestPlace.distance) {
        nearestPlace = { name: row.name, distance };
      }
    }
  }

  if (nearestPlace) {
    return {
      place_name: nearestPlace.name,
      formatted_address: 'University of Ghana, Legon',
      google_place_id: null,
    };
  }

  const resolved = await resolveReverseGeocode(latitude, longitude);
  if (resolved?.place_name || resolved?.formatted_address || resolved?.place_id) {
    return {
      place_name: resolved?.place_name ?? null,
      formatted_address: resolved?.formatted_address ?? null,
      google_place_id: resolved?.place_id ?? null,
    };
  }

  return {
    place_name: null,
    formatted_address: null,
    google_place_id: null,
  };
}
