import { pool } from '../db.js';
import { resolveReverseGeocode } from './google/reverseGeocodeService.js';

export type ResolvedLocation = {
  place_name: string | null;
  formatted_address: string | null;
  google_place_id: string | null;
  building_id: number | null;
  room_id: number | null;
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

/**
 * Resolve a GPS point to a campus place, building, and room using PostGIS.
 * Resolution order:
 *  1. hotspot_places (coarse campus landmarks)
 *  2. hotspot_rooms via ST_Contains on geometry (SRID 4326)
 *  3. hotspot_buildings via ST_Contains on polygon_geometry (SRID 4326)
 *  4. Google reverse geocode fallback
 */
export async function resolveLocation(
  latitude: number,
  longitude: number
): Promise<ResolvedLocation> {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return {
      place_name: null,
      formatted_address: null,
      google_place_id: null,
      building_id: null,
      room_id: null,
    };
  }

  const pointWkt = `POINT(${longitude} ${latitude})`;

  // 1. Coarse campus place lookup
  const campusPlacesResult = await pool.query(
    `
      SELECT id, name, latitude, longitude, radius_meters
      FROM hotspot_places
      WHERE latitude BETWEEN $1 AND $2
        AND longitude BETWEEN $3 AND $4
    `,
    [latitude - 0.01, latitude + 0.01, longitude - 0.01, longitude + 0.01]
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

  // 2. PostGIS room resolution (most specific)
  const roomResult = await pool.query(
    `
      SELECT r.id AS room_id, r.floor_id, r.room_code, r.room_name,
             f.building_id, b.name AS building_name
      FROM hotspot_rooms r
      JOIN hotspot_floors f ON f.id = r.floor_id
      JOIN hotspot_buildings b ON b.id = f.building_id
      WHERE r.is_active = true
        AND b.is_active = true
        AND ST_Contains(
              r.geometry,
              ST_SetSRID(ST_GeomFromText($1), 4326)
            )
      LIMIT 1
    `,
    [pointWkt]
  );

  if (roomResult.rows[0]) {
    const row = roomResult.rows[0];
    return {
      place_name: nearestPlace?.name ?? row.room_name ?? row.room_code ?? null,
      formatted_address: row.building_name ?? null,
      google_place_id: null,
      building_id: row.building_id ?? null,
      room_id: row.room_id ?? null,
    };
  }

  // 3. PostGIS building resolution
  const buildingResult = await pool.query(
    `
      SELECT id AS building_id, name AS building_name
      FROM hotspot_buildings
      WHERE is_active = true
        AND ST_Contains(
              polygon_geometry,
              ST_SetSRID(ST_GeomFromText($1), 4326)
            )
      LIMIT 1
    `,
    [pointWkt]
  );

  if (buildingResult.rows[0]) {
    const row = buildingResult.rows[0];
    return {
      place_name: nearestPlace?.name ?? row.building_name ?? null,
      formatted_address: row.building_name ?? null,
      google_place_id: null,
      building_id: row.building_id ?? null,
      room_id: null,
    };
  }

  // 4. Campus place fallback (no building/room match)
  if (nearestPlace) {
    return {
      place_name: nearestPlace.name,
      formatted_address: 'University of Ghana, Legon',
      google_place_id: null,
      building_id: null,
      room_id: null,
    };
  }

  // 5. Google reverse geocode fallback
  const resolved = await resolveReverseGeocode(latitude, longitude);
  if (resolved?.place_name || resolved?.formatted_address || resolved?.place_id) {
    return {
      place_name: resolved?.place_name ?? null,
      formatted_address: resolved?.formatted_address ?? null,
      google_place_id: resolved?.place_id ?? null,
      building_id: null,
      room_id: null,
    };
  }

  return {
    place_name: null,
    formatted_address: null,
    google_place_id: null,
    building_id: null,
    room_id: null,
  };
}
