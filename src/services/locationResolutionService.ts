import { pool } from '../db.js';
import { resolveReverseGeocode } from './google/reverseGeocodeService.js';

export type ResolvedLocation = {
  place_name: string | null;
  formatted_address: string | null;
  google_place_id: string | null;
  building_id: number | null;
  room_id: number | null;
  is_approximate?: boolean;
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
 * Resolve a GPS point to a campus place, building, and room using PostGIS & campus config.
 * Resolution priority:
 *  1. Active campus location / building / room match
 *  2. Nearest known application landmark
 *  3. Reverse-geocoded address (flagged as approximate area)
 *  4. Coordinates only
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
      is_approximate: true,
    };
  }

  const pointWkt = `POINT(${longitude} ${latitude})`;

  // 1. Campus place lookup (hotspot_places)
  try {
    const campusPlacesResult = await pool.query(
      `
        SELECT id, name, latitude, longitude, radius_meters
        FROM hotspot_places
        WHERE (is_active IS NULL OR is_active = true)
          AND latitude BETWEEN $1 AND $2
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
      const radius = Number(row.radius_meters) || 100;
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
        is_approximate: false,
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
        is_approximate: false,
      };
    }

    // 4. Campus place fallback (matched within radius)
    if (nearestPlace) {
      return {
        place_name: nearestPlace.name,
        formatted_address: 'University of Ghana, Legon',
        google_place_id: null,
        building_id: null,
        room_id: null,
        is_approximate: false,
      };
    }
  } catch (err) {
    console.warn('[LocationResolution] Database campus resolution query failed:', err);
  }

  // 5. Reverse geocode fallback
  try {
    const resolved = await resolveReverseGeocode(latitude, longitude);
    if (resolved?.place_name || resolved?.formatted_address || resolved?.place_id) {
      const rawPlace = resolved?.place_name || resolved?.formatted_address;
      return {
        place_name: rawPlace ? `Approximate area: ${rawPlace}` : null,
        formatted_address: resolved?.formatted_address ?? null,
        google_place_id: resolved?.place_id ?? null,
        building_id: null,
        room_id: null,
        is_approximate: true,
      };
    }
  } catch (geoErr) {
    console.warn('[LocationResolution] Reverse geocoding failed:', geoErr);
  }

  // 6. Coordinates only (fallback)
  return {
    place_name: null,
    formatted_address: null,
    google_place_id: null,
    building_id: null,
    room_id: null,
    is_approximate: true,
  };
}

