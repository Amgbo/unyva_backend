import { pool } from '../db.js';

// ==================== INTERFACES ====================

export interface Campus {
  id?: number;
  name: string;
  code: string;
  country: string;
  latitude: number;
  longitude: number;
  boundary_geometry?: any; // PostGIS geometry
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Building {
  id?: number;
  campus_id: number;
  name: string;
  code: string;
  polygon_geometry?: any; // PostGIS geometry
  address?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Floor {
  id?: number;
  building_id: number;
  floor_number: number;
  name?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Room {
  id?: number;
  floor_id: number;
  room_code: string;
  room_name?: string;
  geometry?: any; // PostGIS geometry
  capacity?: number;
  room_type: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Carrier {
  id?: number;
  name: string;
  country_code: string;
  network_code?: string;
  is_active: boolean;
  display_color: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface DeviceProfile {
  id?: number;
  platform: string;
  manufacturer?: string;
  model?: string;
  os_version?: string;
  app_version?: string;
  capabilities?: any; // JSONB
  created_at?: Date;
}

export interface Measurement {
  id?: number;
  user_id: string;
  carrier_id: number;
  device_profile_id: number;
  room_id?: number | null;
  building_id?: number | null;
  latitude: number;
  longitude: number;
  signal_strength: number; // dBm (-120 to -50)
  signal_quality: number; // 0-100
  network_type: '2G' | '3G' | '4G' | '5G' | 'LTE';
  measurement_timestamp: Date;
  accuracy?: number;
  upload_status: 'pending' | 'uploaded' | 'failed';
  idempotency_key?: string;

  // Google Reverse Geocoding enrichment (nullable; must never break uploads)
  place_name?: string | null;
  formatted_address?: string | null;
  google_place_id?: string | null;

  created_at?: Date;
}

export interface SpeedTest {
  id?: number;
  measurement_id: number;
  download_speed: number; // Mbps
  upload_speed: number; // Mbps
  latency: number; // ms
  jitter?: number; // ms
  packet_loss?: number; // percentage
  server_identifier?: string;
  tested_at: Date;
  created_at?: Date;
}

export interface CoverageSummary {
  id?: number;
  building_id?: number;
  room_id?: number;
  carrier_id: number;
  average_signal_strength: number;
  average_signal_quality: number;
  average_download_speed?: number;
  average_upload_speed?: number;
  average_latency?: number;
  measurement_count: number;
  speed_test_count: number;
  // Real GPS centroid of underlying measurements (independent of building/room
  // tagging accuracy) - used by the recommendation engine for nearest-match.
  average_latitude?: number;
  average_longitude?: number;
  confidence_score?: number;
  reliability_score?: number;
  // Google reverse-geocoding labels from the most recent measurement in the cluster.
  place_name?: string | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
  last_measurement_at?: Date;
  last_updated?: Date;
}

/**
 * A coverage summary enriched with the human-readable building/room name and
 * the distance (meters) from a user-supplied location. This is what the
 * recommendation engine returns - never a seeded/static record.
 */
export interface NearbyCoverageSummary extends CoverageSummary {
  building_name?: string;
  building_code?: string;
  room_name?: string;
  room_code?: string;
  carrier_name?: string;

  // Google reverse geocoding labels (preferred by UI when available)
  place_name?: string | null;
  formatted_address?: string | null;
  google_place_id?: string | null;

  distance_meters: number;
}



export interface HeatmapTile {
  id?: number;
  zoom_level: number;
  tile_x: number;
  tile_y: number;
  carrier_id: number;
  signal_score: number; // 0-100
  measurement_count: number;
  updated_at?: Date;
}

export interface Configuration {
  id?: number;
  config_key: string;
  config_value: any; // JSONB
  description?: string;
  is_public: boolean;
  updated_at?: Date;
  updated_by?: string;
}

// ==================== MODELS ====================

export class CampusModel {
  static async create(campus: Omit<Campus, 'id' | 'created_at' | 'updated_at'>): Promise<Campus> {
    const query = `
      INSERT INTO hotspot_campuses (name, code, country, latitude, longitude, boundary_geometry, is_active)
      VALUES ($1, $2, $3, $4, $5, ST_GeomFromText($6, 4326), $7)
      RETURNING *
    `;
    const values = [
      campus.name,
      campus.code,
      campus.country,
      campus.latitude,
      campus.longitude,
      campus.boundary_geometry ? `POLYGON((${campus.boundary_geometry}))` : null,
      campus.is_active
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: number): Promise<Campus | null> {
    const result = await pool.query('SELECT * FROM hotspot_campuses WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByCode(code: string): Promise<Campus | null> {
    const result = await pool.query('SELECT * FROM hotspot_campuses WHERE code = $1', [code]);
    return result.rows[0] || null;
  }

  static async findByCodeInsensitive(code: string): Promise<Campus | null> {
    const result = await pool.query('SELECT * FROM hotspot_campuses WHERE LOWER(code) = LOWER($1) LIMIT 1', [code]);
    return result.rows[0] || null;
  }

  static async findByCodeOrId(input: string): Promise<Campus | null> {
    const normalized = String(input || '').trim();
    if (!normalized) return null;

    if (/^\d+$/.test(normalized)) {
      const byId = await this.findById(Number(normalized));
      if (byId) return byId;
    }

    const byCode = await this.findByCode(normalized);
    if (byCode) return byCode;

    return this.findByCodeInsensitive(normalized);
  }

  static async findAll(activeOnly: boolean = true): Promise<Campus[]> {
    const query = activeOnly 
      ? 'SELECT * FROM hotspot_campuses WHERE is_active = true ORDER BY name' 
      : 'SELECT * FROM hotspot_campuses ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }

  static async update(id: number, updates: Partial<Campus>): Promise<Campus | null> {
    const allowedFields = ['name', 'code', 'country', 'latitude', 'longitude', 'is_active'];
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field as keyof Campus] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(updates[field as keyof Campus]);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(id);

    const query = `
      UPDATE hotspot_campuses 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0] || null;
  }
}

export class BuildingModel {
  static async create(building: Omit<Building, 'id' | 'created_at' | 'updated_at'>): Promise<Building> {
    const query = `
      INSERT INTO hotspot_buildings (campus_id, name, code, polygon_geometry, address, is_active)
      VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6)
      RETURNING *
    `;
    const values = [
      building.campus_id,
      building.name,
      building.code,
      building.polygon_geometry ? `POLYGON((${building.polygon_geometry}))` : null,
      building.address,
      building.is_active
    ];
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  static async findById(id: number): Promise<Building | null> {
    const result = await pool.query('SELECT * FROM hotspot_buildings WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByCampus(campusId: number, activeOnly: boolean = true): Promise<Building[]> {
    const query = activeOnly
      ? 'SELECT * FROM hotspot_buildings WHERE campus_id = $1 AND is_active = true ORDER BY name'
      : 'SELECT * FROM hotspot_buildings WHERE campus_id = $1 ORDER BY name';
    const result = await pool.query(query, [campusId]);
    return result.rows;
  }

  static async findByCode(campusId: number, code: string): Promise<Building | null> {
    const result = await pool.query(
      'SELECT * FROM hotspot_buildings WHERE campus_id = $1 AND code = $2',
      [campusId, code]
    );
    return result.rows[0] || null;
  }
}

export class FloorModel {
  static async create(floor: Omit<Floor, 'id' | 'created_at' | 'updated_at'>): Promise<Floor> {
    const query = `
      INSERT INTO hotspot_floors (building_id, floor_number, name, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    const result = await pool.query(query, [
      floor.building_id,
      floor.floor_number,
      floor.name,
      floor.is_active
    ]);
    return result.rows[0];
  }

  static async findByBuilding(buildingId: number, activeOnly: boolean = true): Promise<Floor[]> {
    const query = activeOnly
      ? 'SELECT * FROM hotspot_floors WHERE building_id = $1 AND is_active = true ORDER BY floor_number'
      : 'SELECT * FROM hotspot_floors WHERE building_id = $1 ORDER BY floor_number';
    const result = await pool.query(query, [buildingId]);
    return result.rows;
  }
}

export class RoomModel {
  static async create(room: Omit<Room, 'id' | 'created_at' | 'updated_at'>): Promise<Room> {
    const query = `
      INSERT INTO hotspot_rooms (floor_id, room_code, room_name, geometry, capacity, room_type, is_active)
      VALUES ($1, $2, $3, ST_GeomFromText($4, 4326), $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      room.floor_id,
      room.room_code,
      room.room_name,
      room.geometry ? `POLYGON((${room.geometry}))` : null,
      room.capacity,
      room.room_type,
      room.is_active
    ]);
    return result.rows[0];
  }

  static async findByFloor(floorId: number, activeOnly: boolean = true): Promise<Room[]> {
    const query = activeOnly
      ? 'SELECT * FROM hotspot_rooms WHERE floor_id = $1 AND is_active = true ORDER BY room_code'
      : 'SELECT * FROM hotspot_rooms WHERE floor_id = $1 ORDER BY room_code';
    const result = await pool.query(query, [floorId]);
    return result.rows;
  }

  static async findByCode(floorId: number, code: string): Promise<Room | null> {
    const result = await pool.query(
      'SELECT * FROM hotspot_rooms WHERE floor_id = $1 AND room_code = $2',
      [floorId, code]
    );
    return result.rows[0] || null;
  }
}

export class CarrierModel {
  static async create(carrier: Omit<Carrier, 'id' | 'created_at' | 'updated_at'>): Promise<Carrier> {
    const query = `
      INSERT INTO hotspot_carriers (name, country_code, network_code, is_active, display_color)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const result = await pool.query(query, [
      carrier.name,
      carrier.country_code,
      carrier.network_code,
      carrier.is_active,
      carrier.display_color
    ]);
    return result.rows[0];
  }

  static async findById(id: number): Promise<Carrier | null> {
    const result = await pool.query('SELECT * FROM hotspot_carriers WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByName(name: string): Promise<Carrier | null> {
    const result = await pool.query('SELECT * FROM hotspot_carriers WHERE name = $1', [name]);
    return result.rows[0] || null;
  }

  static async findAll(activeOnly: boolean = true): Promise<Carrier[]> {
    const query = activeOnly
      ? 'SELECT * FROM hotspot_carriers WHERE is_active = true ORDER BY name'
      : 'SELECT * FROM hotspot_carriers ORDER BY name';
    const result = await pool.query(query);
    return result.rows;
  }
}

export class DeviceProfileModel {
  static async findOrCreate(profile: Omit<DeviceProfile, 'id' | 'created_at'>): Promise<DeviceProfile> {
    // Try to find existing
    const existing = await this.findByDetails(profile);
    if (existing) return existing;

    // Create new
    const query = `
      INSERT INTO hotspot_device_profiles (platform, manufacturer, model, os_version, app_version, capabilities)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (platform, manufacturer, model, os_version, app_version) 
      DO UPDATE SET capabilities = EXCLUDED.capabilities
      RETURNING *
    `;
    const result = await pool.query(query, [
      profile.platform,
      profile.manufacturer,
      profile.model,
      profile.os_version,
      profile.app_version,
      JSON.stringify(profile.capabilities || {})
    ]);
    return result.rows[0];
  }

  static async findByDetails(profile: Omit<DeviceProfile, 'id' | 'created_at'>): Promise<DeviceProfile | null> {
    const query = `
      SELECT * FROM hotspot_device_profiles 
      WHERE platform = $1 AND manufacturer = $2 AND model = $3 
        AND os_version = $4 AND app_version = $5
    `;
    const result = await pool.query(query, [
      profile.platform,
      profile.manufacturer,
      profile.model,
      profile.os_version,
      profile.app_version
    ]);
    return result.rows[0] || null;
  }

  static async findById(id: number): Promise<DeviceProfile | null> {
    const result = await pool.query('SELECT * FROM hotspot_device_profiles WHERE id = $1', [id]);
    return result.rows[0] || null;
  }
}

export class MeasurementModel {
  static async create(measurement: Omit<Measurement, 'id' | 'created_at'>): Promise<Measurement> {
    const query = `
      INSERT INTO hotspot_measurements (
        user_id, carrier_id, device_profile_id, room_id, building_id,
        latitude, longitude, signal_strength, signal_quality, network_type,
        measurement_timestamp, accuracy, upload_status, idempotency_key,
        place_name, formatted_address, google_place_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
    `;
    const result = await pool.query(query, [
      measurement.user_id,
      measurement.carrier_id,
      measurement.device_profile_id,
      measurement.room_id,
      measurement.building_id,
      measurement.latitude,
      measurement.longitude,
      measurement.signal_strength,
      measurement.signal_quality,
      measurement.network_type,
      measurement.measurement_timestamp,
      measurement.accuracy,
      measurement.upload_status,
      measurement.idempotency_key,
      measurement.place_name ?? null,
      measurement.formatted_address ?? null,
      measurement.google_place_id ?? null
    ]);
    return result.rows[0];
  }

  static async findById(id: number): Promise<Measurement | null> {
    const result = await pool.query('SELECT * FROM hotspot_measurements WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  static async findByUser(userId: string, options: {
    limit?: number;
    offset?: number;
    carrierId?: number;
    buildingId?: number;
  } = {}): Promise<Measurement[]> {
    const { limit = 100, offset = 0, carrierId, buildingId } = options;
    
    let query = 'SELECT * FROM hotspot_measurements WHERE user_id = $1';
    const params: any[] = [userId];
    let paramIndex = 2;

    if (carrierId) {
      query += ` AND carrier_id = $${paramIndex}`;
      params.push(carrierId);
      paramIndex++;
    }

    if (buildingId) {
      query += ` AND building_id = $${paramIndex}`;
      params.push(buildingId);
      paramIndex++;
    }

    query += ` ORDER BY measurement_timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findPendingUploads(limit: number = 100): Promise<Measurement[]> {
    const query = `
      SELECT * FROM hotspot_measurements 
      WHERE upload_status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT $1
    `;
    const result = await pool.query(query, [limit]);
    return result.rows;
  }

  static async updateUploadStatus(id: number, status: 'uploaded' | 'failed'): Promise<Measurement | null> {
    const query = `
      UPDATE hotspot_measurements 
      SET upload_status = $1 
      WHERE id = $2 
      RETURNING *
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0] || null;
  }

  static async countByBuilding(buildingId: number, carrierId?: number): Promise<number> {
    let query = 'SELECT COUNT(*) FROM hotspot_measurements WHERE building_id = $1';
    const params: any[] = [buildingId];

    if (carrierId) {
      query += ' AND carrier_id = $2';
      params.push(carrierId);
    }

    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count);
  }
}

export class SpeedTestModel {
  static async create(speedTest: Omit<SpeedTest, 'id' | 'created_at'>): Promise<SpeedTest> {
    const query = `
      INSERT INTO hotspot_speed_tests (
        measurement_id, download_speed, upload_speed, latency, jitter,
        packet_loss, server_identifier, tested_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await pool.query(query, [
      speedTest.measurement_id,
      speedTest.download_speed,
      speedTest.upload_speed,
      speedTest.latency,
      speedTest.jitter,
      speedTest.packet_loss,
      speedTest.server_identifier,
      speedTest.tested_at
    ]);
    return result.rows[0];
  }

  static async findByMeasurement(measurementId: number): Promise<SpeedTest | null> {
    const result = await pool.query(
      'SELECT * FROM hotspot_speed_tests WHERE measurement_id = $1',
      [measurementId]
    );
    return result.rows[0] || null;
  }
}

export class CoverageSummaryModel {
  static async findByBuilding(buildingId: number, carrierId?: number): Promise<CoverageSummary[]> {
    let query = 'SELECT * FROM hotspot_coverage_summary WHERE building_id = $1';
    const params: any[] = [buildingId];

    if (carrierId) {
      query += ' AND carrier_id = $2';
      params.push(carrierId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async findByRoom(roomId: number, carrierId?: number): Promise<CoverageSummary[]> {
    let query = 'SELECT * FROM hotspot_coverage_summary WHERE room_id = $1';
    const params: any[] = [roomId];

    if (carrierId) {
      query += ' AND carrier_id = $2';
      params.push(carrierId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }

  static async upsert(summary: Omit<CoverageSummary, 'id' | 'last_updated'>): Promise<CoverageSummary> {
    const query = `
      INSERT INTO hotspot_coverage_summary (
        building_id, room_id, carrier_id, average_signal_strength,
        average_signal_quality, average_download_speed, average_upload_speed,
        average_latency, measurement_count, speed_test_count,
        average_latitude, average_longitude, confidence_score, reliability_score,
        place_name, formatted_address, google_place_id,
        last_measurement_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      ON CONFLICT (building_id, room_id, carrier_id)
      DO UPDATE SET
        average_signal_strength = EXCLUDED.average_signal_strength,
        average_signal_quality = EXCLUDED.average_signal_quality,
        average_download_speed = EXCLUDED.average_download_speed,
        average_upload_speed = EXCLUDED.average_upload_speed,
        average_latency = EXCLUDED.average_latency,
        measurement_count = EXCLUDED.measurement_count,
        speed_test_count = EXCLUDED.speed_test_count,
        average_latitude = EXCLUDED.average_latitude,
        average_longitude = EXCLUDED.average_longitude,
        confidence_score = EXCLUDED.confidence_score,
        reliability_score = EXCLUDED.reliability_score,
        place_name = EXCLUDED.place_name,
        formatted_address = EXCLUDED.formatted_address,
        google_place_id = EXCLUDED.google_place_id,
        last_measurement_at = EXCLUDED.last_measurement_at,
        last_updated = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [
      summary.building_id,
      summary.room_id,
      summary.carrier_id,
      summary.average_signal_strength,
      summary.average_signal_quality,
      summary.average_download_speed,
      summary.average_upload_speed,
      summary.average_latency,
      summary.measurement_count,
      summary.speed_test_count,
      summary.average_latitude ?? null,
      summary.average_longitude ?? null,
      summary.confidence_score ?? null,
      summary.reliability_score ?? null,
      summary.place_name ?? null,
      summary.formatted_address ?? null,
      summary.google_place_id ?? null,
      summary.last_measurement_at ?? null,
    ]);
    return result.rows[0];
  }

  /**
   * Find coverage summaries geographically nearest to a user-supplied
   * latitude/longitude, using the real GPS centroid of the underlying raw
   * measurements (average_latitude/average_longitude) - NOT building
   * polygon centers, and NOT seeded/static locations.
   *
   * This is the core of the crowdsourced recommendation engine: it only
   * ever returns rows that were populated by the aggregation pipeline from
   * real hotspot_measurements rows.
   *
   * Uses the Haversine formula directly in SQL so results are ordered by
   * true distance in meters.
   */
  static async findNearby(params: {
    latitude: number;
    longitude: number;
    radiusMeters?: number;
    carrierId?: number;
    limit?: number;
  }): Promise<NearbyCoverageSummary[]> {
    const { latitude, longitude, radiusMeters = 1500, carrierId, limit = 20 } = params;

    const limitParamIndex = carrierId ? 4 : 3;
    const carrierFilter = carrierId ? 'AND cs.carrier_id = $3' : '';
    const query = `
      SELECT
        cs.*,
        c.name AS carrier_name,
        (
          6371000 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($1)) * cos(radians(cs.average_latitude)) *
              cos(radians(cs.average_longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(cs.average_latitude))
            ))
          )
        ) AS distance_meters
      FROM hotspot_coverage_summary cs
      LEFT JOIN hotspot_carriers c ON c.id = cs.carrier_id
      WHERE cs.measurement_count > 0
        AND (
          (cs.average_latitude IS NOT NULL AND cs.average_longitude IS NOT NULL)
          OR (
            cs.building_id IS NOT NULL AND EXISTS (
              SELECT 1
              FROM hotspot_measurements m
              WHERE m.building_id = cs.building_id
                AND m.latitude IS NOT NULL
                AND m.longitude IS NOT NULL
                AND (
                  6371000 * acos(
                    LEAST(1.0, GREATEST(-1.0,
                      cos(radians($1)) * cos(radians(m.latitude)) *
                      cos(radians(m.longitude) - radians($2)) +
                      sin(radians($1)) * sin(radians(m.latitude))
                    ))
                  )
                ) <= ${radiusMeters ?? 1500}
              LIMIT 1
            )
          )
        )
        ${carrierFilter}
      ORDER BY distance_meters ASC NULLS LAST
      LIMIT $${limitParamIndex}
    `;

    const values: any[] = [latitude, longitude];
    if (carrierId) values.push(carrierId);
    values.push(limit * 3);

    const result = await pool.query(query, values);

    const nearbyRows = (result.rows as NearbyCoverageSummary[])
      .filter((row) => row.distance_meters <= radiusMeters)
      .slice(0, limit)
      .map((row) => ({
        ...row,
        // Ensure the frontend never receives a null/placeholder location.
        distance_meters: row.distance_meters ?? Number.POSITIVE_INFINITY,
      }))
      .filter((row) => Number.isFinite(row.distance_meters));

    // Enrich nearby results with Google place labels from the underlying raw measurements.
    // We look for the most recent measurement inside the same GPS cluster radius.
    const enriched: NearbyCoverageSummary[] = [];
    for (const row of nearbyRows) {
      let place_name: string | null = row.place_name ?? null;
      let formatted_address: string | null = row.formatted_address ?? null;
      let google_place_id: string | null = row.google_place_id ?? null;

      if (!place_name && row.average_latitude != null && row.average_longitude != null) {
        const placeQuery = `
          SELECT place_name, formatted_address, google_place_id
          FROM hotspot_measurements
          WHERE carrier_id = $1
            AND place_name IS NOT NULL
            AND latitude IS NOT NULL
            AND longitude IS NOT NULL
            AND (
              6371000 * acos(
                LEAST(1.0, GREATEST(-1.0,
                  cos(radians($2)) * cos(radians(latitude)) *
                  cos(radians(longitude) - radians($3)) +
                  sin(radians($2)) * sin(radians(latitude))
                ))
              )
            ) <= 50
          ORDER BY measurement_timestamp DESC
          LIMIT 1
        `;
        const r = await pool.query(placeQuery, [
          row.carrier_id,
          row.average_latitude,
          row.average_longitude,
        ]);
        if (r.rows[0]) {
          place_name = r.rows[0].place_name;
          formatted_address = r.rows[0].formatted_address;
          google_place_id = r.rows[0].google_place_id;
        }
      }

      enriched.push({
        ...row,
        place_name,
        formatted_address,
        google_place_id,
      });
    }

    return enriched;
  }
}


export class HeatmapTileModel {
  static async upsert(tile: Omit<HeatmapTile, 'id' | 'updated_at'>): Promise<HeatmapTile> {
    const query = `
      INSERT INTO hotspot_heatmap_tiles (zoom_level, tile_x, tile_y, carrier_id, signal_score, measurement_count)
      VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (zoom_level, tile_x, tile_y, carrier_id)
      DO UPDATE SET
        signal_score = EXCLUDED.signal_score,
        measurement_count = EXCLUDED.measurement_count,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [
      tile.zoom_level,
      tile.tile_x,
      tile.tile_y,
      tile.carrier_id,
      tile.signal_score,
      tile.measurement_count
    ]);
    return result.rows[0];
  }

  static async findByZoomAndBounds(zoomLevel: number, minX: number, minY: number, maxX: number, maxY: number, carrierId?: number): Promise<HeatmapTile[]> {
    let query = `
      SELECT * FROM hotspot_heatmap_tiles 
      WHERE zoom_level = $1 AND tile_x BETWEEN $2 AND $3 AND tile_y BETWEEN $4 AND $5
    `;
    const params: any[] = [zoomLevel, minX, maxX, minY, maxY];

    if (carrierId) {
      query += ' AND carrier_id = $6';
      params.push(carrierId);
    }

    const result = await pool.query(query, params);
    return result.rows;
  }
}

export class ConfigurationModel {
  static async get(key: string): Promise<Configuration | null> {
    const result = await pool.query(
      'SELECT * FROM hotspot_configuration WHERE config_key = $1',
      [key]
    );
    return result.rows[0] || null;
  }

  static async getValue<T>(key: string): Promise<T | null> {
    const config = await this.get(key);
    return config ? config.config_value.value : null;
  }

  static async set(key: string, value: any, description?: string, isPublic: boolean = true, updatedBy?: string): Promise<Configuration> {
    const query = `
      INSERT INTO hotspot_configuration (config_key, config_value, description, is_public, updated_by)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (config_key)
      DO UPDATE SET
        config_value = EXCLUDED.config_value,
        description = EXCLUDED.description,
        is_public = EXCLUDED.is_public,
        updated_by = EXCLUDED.updated_by,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    const result = await pool.query(query, [
      key,
      JSON.stringify({ value }),
      description,
      isPublic,
      updatedBy
    ]);
    return result.rows[0];
  }

  static async getAll(publicOnly: boolean = true): Promise<Configuration[]> {
    const query = publicOnly
      ? 'SELECT * FROM hotspot_configuration WHERE is_public = true ORDER BY config_key'
      : 'SELECT * FROM hotspot_configuration ORDER BY config_key';
    const result = await pool.query(query);
    return result.rows;
  }
}