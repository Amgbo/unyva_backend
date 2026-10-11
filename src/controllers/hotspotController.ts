import { Request, Response } from 'express';
import {
  CampusModel,
  BuildingModel,
  FloorModel,
  RoomModel,
  CarrierModel,
  DeviceProfileModel,
  MeasurementModel,
  SpeedTestModel,
  CoverageSummaryModel,
  HeatmapTileModel,
  ConfigurationModel,
  type Measurement,
  type SpeedTest
} from '../models/hotspotModels.js';
import { aggregationQueue } from '../services/aggregationQueue.js';
import { aggregationService } from '../services/aggregationService.js';
import { resolveLocation } from '../services/locationResolutionService.js';

// Ingestion options: when true, the measurement upload path resolves each
// GPS point to a PostGIS building/room and stores the resolved IDs on the
// hotspot_measurements row. This enables building/room analytics while still
// keeping the nearby recommendation engine GPS-first.
const ENABLE_POSTGIS_RESOLUTION = true;

const normalizeIdentifier = (value: string): string => {
  const raw = String(value || '').trim();
  if (!raw) return raw;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
};

/**
 * Devices (especially iOS) may not report raw dBm. When signal_strength is
 * missing, derive an approximate dBm from signal_quality so measurements can
 * still be stored and aggregated.
 */
const resolveSignalStrength = (
  signalStrength: number | null | undefined,
  signalQuality: number | null | undefined
): number | null => {
  if (signalStrength != null && Number.isFinite(signalStrength)) {
    return signalStrength;
  }

  if (signalQuality == null || !Number.isFinite(signalQuality)) {
    return null;
  }

  const clampedQuality = Math.max(0, Math.min(100, signalQuality));
  return Math.round(-120 + (clampedQuality / 100) * 70);
};

// ==================== CONFIGURATION ENDPOINTS ====================

// GET /api/hotspot/config - Get public configuration
export const getPublicConfig = async (_req: Request, res: Response): Promise<void> => {
  try {
    const configs = await ConfigurationModel.getAll(true);
    const publicConfig: Record<string, any> = {};
    
    for (const config of configs) {
      publicConfig[config.config_key] = config.config_value.value;
    }

    res.status(200).json({
      success: true,
      config: publicConfig
    });
  } catch (err: any) {
    console.error('❌ Get Public Config Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch configuration',
      message: err.message
    });
  }
};

// ==================== CAMPUS ENDPOINTS ====================

// GET /api/hotspot/campuses - Get all campuses
export const getCampuses = async (_req: Request, res: Response): Promise<void> => {
  try {
    const campuses = await CampusModel.findAll(true);
    
    res.status(200).json({
      success: true,
      campuses
    });
  } catch (err: any) {
    console.error('❌ Get Campuses Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campuses',
      message: err.message
    });
  }
};

// GET /api/hotspot/campuses/:code - Get campus by code
export const getCampusByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;
    const campus = await CampusModel.findByCodeOrId(normalizeIdentifier(code));
    
    if (!campus) {
      res.status(404).json({
        success: false,
        error: 'Campus not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      campus
    });
  } catch (err: any) {
    console.error('❌ Get Campus By Code Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch campus',
      message: err.message
    });
  }
};

// ==================== BUILDING ENDPOINTS ====================

// GET /api/hotspot/campuses/:campusCode/buildings - Get buildings by campus
export const getBuildingsByCampus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { campusCode } = req.params;
    const campus = await CampusModel.findByCodeOrId(normalizeIdentifier(campusCode));
    
    if (!campus || !campus.id) {
      res.status(404).json({
        success: false,
        error: 'Campus not found'
      });
      return;
    }

    const buildings = await BuildingModel.findByCampus(campus.id, true);
    
    res.status(200).json({
      success: true,
      buildings
    });
  } catch (err: any) {
    console.error('❌ Get Buildings By Campus Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch buildings',
      message: err.message
    });
  }
};

// GET /api/hotspot/buildings/:buildingId/floors - Get floors by building
export const getFloorsByBuilding = async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingId } = req.params;
    const floors = await FloorModel.findByBuilding(parseInt(buildingId), true);
    
    res.status(200).json({
      success: true,
      floors
    });
  } catch (err: any) {
    console.error('❌ Get Floors By Building Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch floors',
      message: err.message
    });
  }
};

// GET /api/hotspot/floors/:floorId/rooms - Get rooms by floor
export const getRoomsByFloor = async (req: Request, res: Response): Promise<void> => {
  try {
    const { floorId } = req.params;
    const rooms = await RoomModel.findByFloor(parseInt(floorId), true);
    
    res.status(200).json({
      success: true,
      rooms
    });
  } catch (err: any) {
    console.error('❌ Get Rooms By Floor Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch rooms',
      message: err.message
    });
  }
};

// ==================== CARRIER ENDPOINTS ====================

// GET /api/hotspot/carriers - Get all active carriers
export const getCarriers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const carriers = await CarrierModel.findAll(true);
    
    res.status(200).json({
      success: true,
      carriers
    });
  } catch (err: any) {
    console.error('❌ Get Carriers Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch carriers',
      message: err.message
    });
  }
};

// ==================== MEASUREMENT ENDPOINTS ====================

// POST /api/hotspot/measurements - Submit network measurements (batch)
export const submitMeasurements = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const { measurements, device_profile } = req.body;

    if (!measurements || !Array.isArray(measurements) || measurements.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Measurements array is required'
      });
      return;
    }

    // Find or create device profile
    const deviceProfile = await DeviceProfileModel.findOrCreate({
      platform: device_profile?.platform || 'unknown',
      manufacturer: device_profile?.manufacturer || null,
      model: device_profile?.model || null,
      os_version: device_profile?.os_version || null,
      app_version: device_profile?.app_version || null,
      capabilities: device_profile?.capabilities || {}
    });

    const createdMeasurements: Measurement[] = [];
    const seenIdempotencyKeys = new Set<string>();

    // Pre-fetch active carriers to validate submitted carrier_ids
    const activeCarriers = await CarrierModel.findAll(true);
    const validCarrierIds = new Set(activeCarriers.map(c => c.id));

    // Upload path must never call Google per measurement.
    for (const measurement of measurements) {
      const resolvedSignalStrength = resolveSignalStrength(
        measurement.signal_strength,
        measurement.signal_quality
      );

      // Validate required carrier ID against database
      if (!measurement.carrier_id || !validCarrierIds.has(Number(measurement.carrier_id))) {
        console.warn(`[SubmitMeasurement] Rejected invalid or inactive carrier_id: ${measurement.carrier_id}`);
        continue; // Skip measurements with invalid/missing carrier
      }

      // Validate required signal fields
      if (
        resolvedSignalStrength == null ||
        measurement.signal_quality == null ||
        !measurement.network_type
      ) {
        continue;
      }

      // Validate signal strength range (-120 to -50)
      if (resolvedSignalStrength < -120 || resolvedSignalStrength > -50) {
        continue;
      }

      // Validate signal quality range (0 to 100)
      if (measurement.signal_quality < 0 || measurement.signal_quality > 100) {
        continue;
      }

      // Validate network type
      if (!['2G', '3G', '4G', '5G', 'LTE'].includes(measurement.network_type)) {
        continue;
      }

      // GPS validation: latitude (-90 to 90), longitude (-180 to 180)
      const latN = Number(measurement.latitude);
      const lngN = Number(measurement.longitude);
      if (!Number.isFinite(latN) || !Number.isFinite(lngN) || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
        continue;
      }

      // Accuracy validation: reject poor accuracy (> 100m or negative/zero)
      const accuracyN = measurement.accuracy != null ? Number(measurement.accuracy) : null;
      if (accuracyN != null && (accuracyN > 100 || accuracyN <= 0)) {
        console.warn(`[SubmitMeasurement] Rejected measurement with poor GPS accuracy: ${accuracyN}m`);
        continue;
      }

      try {
        const idempotencyKey = measurement.idempotency_key || `${studentId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        if (seenIdempotencyKeys.has(idempotencyKey)) {
          continue;
        }
        seenIdempotencyKeys.add(idempotencyKey);

        let resolvedBuildingId: number | null = null;
        let resolvedRoomId: number | null = null;
        let placeName: string | null = null;
        let formattedAddress: string | null = null;
        let googlePlaceId: string | null = null;

        if (ENABLE_POSTGIS_RESOLUTION) {
          try {
            const resolved = await resolveLocation(latN, lngN);
            resolvedBuildingId = resolved.building_id;
            resolvedRoomId = resolved.room_id;
            placeName = resolved.place_name;
            formattedAddress = resolved.formatted_address;
            googlePlaceId = resolved.google_place_id;
          } catch (resolveError) {
            console.warn('[Hotspot] PostGIS resolution failed for upload:', resolveError);
          }
        }

        const created = await MeasurementModel.create({
          user_id: studentId,
          carrier_id: Number(measurement.carrier_id),
          device_profile_id: deviceProfile.id!,
          room_id: resolvedRoomId,
          building_id: resolvedBuildingId,
          latitude: latN,
          longitude: lngN,
          signal_strength: resolvedSignalStrength,
          signal_quality: measurement.signal_quality,
          network_type: measurement.network_type as '2G' | '3G' | '4G' | '5G' | 'LTE',
          measurement_timestamp: new Date(measurement.measurement_timestamp || Date.now()),
          accuracy: accuracyN,
          upload_status: 'uploaded',
          idempotency_key: idempotencyKey,
          place_name: placeName,
          formatted_address: formattedAddress,
          google_place_id: googlePlaceId
        });

        createdMeasurements.push(created);
      } catch (measurementError: any) {
        if (measurementError?.code === '23505') {
          console.warn('Duplicate measurement idempotency key, skipping:', measurementError?.detail);
          continue;
        }
        console.warn('Failed to create individual measurement:', measurementError);
      }
    }

    console.log(`✅ Submitted ${createdMeasurements.length} measurements`);

    if (createdMeasurements.length > 0) {
      aggregationService.aggregateAll().then(async () => {
        try {
          const diag = await (await import('../db.js')).pool.query(
            `
              SELECT
                COUNT(*)::int AS total,
                SUM(CASE WHEN average_latitude IS NOT NULL AND average_longitude IS NOT NULL THEN 1 ELSE 0 END)::int AS with_centroid,
                SUM(CASE WHEN measurement_count > 0 THEN 1 ELSE 0 END)::int AS with_measurements
              FROM hotspot_coverage_summary
              WHERE carrier_id = ANY($1)
            `,
            [Array.from(new Set(createdMeasurements.map(m => m.carrier_id)))]
          );
          console.log('[Hotspot] Aggregation diagnostics coverage_summary:', diag.rows[0]);
        } catch (e) {
          console.warn('[Hotspot] Aggregation diagnostics failed:', e);
        }
      }).catch(err => {
        console.error('[Hotspot] Immediate aggregation failed:', err);
      });
      aggregationQueue.add({
        buildingId: 0,
        timestamp: Date.now(),
        source: 'measurement_upload',
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${createdMeasurements.length} measurements`,
      count: createdMeasurements.length,
      measurement_ids: createdMeasurements.map(m => m.id),
    });
  } catch (err: any) {
    console.error('❌ Submit Measurements Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to submit measurements',
      message: err.message
    });
  }
};

// GET /api/hotspot/measurements - Get user's measurements with pagination
export const getMeasurements = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const { limit = 100, offset = 0, carrier_id, building_id } = req.query;

    const measurements = await MeasurementModel.findByUser(studentId, {
      limit: Number(limit),
      offset: Number(offset),
      carrierId: carrier_id ? Number(carrier_id) : undefined,
      buildingId: building_id ? Number(building_id) : undefined
    });

    res.status(200).json({
      success: true,
      measurements,
      count: measurements.length
    });
  } catch (err: any) {
    console.error('❌ Get Measurements Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch measurements',
      message: err.message
    });
  }
};

// ==================== SPEED TEST ENDPOINTS ====================

// POST /api/hotspot/speed-tests - Submit speed test result
export const submitSpeedTest = async (req: any, res: Response): Promise<void> => {
  try {
    const studentId = req.user?.student_id;
    
    if (!studentId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const { measurement_id, download_speed, upload_speed, latency, jitter, packet_loss, server_identifier } = req.body;

    if (!measurement_id || download_speed === undefined || upload_speed === undefined || latency === undefined) {
      res.status(400).json({
        success: false,
        error: 'measurement_id, download_speed, upload_speed, and latency are required'
      });
      return;
    }

    const measurement = await MeasurementModel.findById(measurement_id);
    
    if (!measurement) {
      res.status(404).json({
        success: false,
        error: 'Measurement not found'
      });
      return;
    }

    if (measurement.user_id !== studentId) {
      res.status(403).json({
        success: false,
        error: 'You can only submit speed tests for your own measurements'
      });
      return;
    }

    const existingSpeedTest = await SpeedTestModel.findByMeasurement(measurement_id);
    
    if (existingSpeedTest) {
      res.status(409).json({
        success: false,
        error: 'Speed test already exists for this measurement'
      });
      return;
    }

    if (download_speed < 0 || upload_speed < 0 || latency < 0) {
      res.status(400).json({
        success: false,
        error: 'Speed test values must be non-negative'
      });
      return;
    }

    const speedTest: SpeedTest = {
      measurement_id,
      download_speed,
      upload_speed,
      latency,
      jitter: jitter || undefined,
      packet_loss: packet_loss || 0,
      server_identifier: server_identifier || undefined,
      tested_at: new Date()
    };

    const created = await SpeedTestModel.create(speedTest);

    console.log(`✅ Speed test submitted: ${created.download_speed}Mbps down, ${created.upload_speed}Mbps up`);

    res.status(201).json({
      success: true,
      message: 'Speed test submitted successfully',
      speed_test: created
    });
  } catch (err: any) {
    console.error('❌ Submit Speed Test Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to submit speed test',
      message: err.message
    });
  }
};

// ==================== COVERAGE ENDPOINTS ====================

// GET /api/hotspot/coverage/buildings/:buildingId - Get coverage summary for a building
export const getBuildingCoverage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingId } = req.params;
    const { carrier_id } = req.query;

    const summaries = await CoverageSummaryModel.findByBuilding(
      parseInt(buildingId),
      carrier_id ? Number(carrier_id) : undefined
    );

    res.status(200).json({
      success: true,
      coverage: summaries
    });
  } catch (err: any) {
    console.error('❌ Get Building Coverage Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch building coverage',
      message: err.message
    });
  }
};

// GET /api/hotspot/coverage/rooms/:roomId - Get coverage summary for a room
export const getRoomCoverage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { roomId } = req.params;
    const { carrier_id } = req.query;

    const summaries = await CoverageSummaryModel.findByRoom(
      parseInt(roomId),
      carrier_id ? Number(carrier_id) : undefined
    );

    res.status(200).json({
      success: true,
      coverage: summaries
    });
  } catch (err: any) {
    console.error('❌ Get Room Coverage Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch room coverage',
      message: err.message
    });
  }
};

// ==================== HEATMAP ENDPOINTS ====================

// GET /api/hotspot/heatmap - Get heatmap tiles for a specific zoom and bounds
export const getHeatmapTiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const { zoom, min_x, min_y, max_x, max_y, carrier_id } = req.query;

    const toFiniteNumber = (v: any): number | null => {
      if (v === undefined || v === null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const zoomN = toFiniteNumber(zoom);
    const minXN = toFiniteNumber(min_x);
    const minYN = toFiniteNumber(min_y);
    const maxXN = toFiniteNumber(max_x);
    const maxYN = toFiniteNumber(max_y);
    const carrierIdN = carrier_id !== undefined ? toFiniteNumber(carrier_id) : null;

    if (zoomN === null || minXN === null || minYN === null || maxXN === null || maxYN === null) {
      res.status(400).json({
        success: false,
        error: 'zoom, min_x, min_y, max_x, max_y must be valid numbers'
      });
      return;
    }

    const tiles = await HeatmapTileModel.findByZoomAndBounds(
      zoomN,
      minXN,
      minYN,
      maxXN,
      maxYN,
      carrierIdN !== null ? carrierIdN : undefined
    );

    res.status(200).json({
      success: true,
      tiles
    });
  } catch (err: any) {
    console.error('❌ Get Heatmap Tiles Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch heatmap tiles',
      message: err.message
    });
  }
};

// ==================== COMMUNITY (GPS) ENDPOINTS ====================

// GET /api/hotspot/nearby - Get nearby aggregated coverage summaries ranked by GPS distance
export const getNearbyCoverageSummaries = async (req: Request, res: Response): Promise<void> => {
  console.log('🔥 getNearbyCoverageSummaries called:', req.query);
  try {
    const { latitude, longitude, radiusMeters, carrier_id } = req.query;

    const latN = latitude !== undefined ? Number(latitude) : NaN;
    const lngN = longitude !== undefined ? Number(longitude) : NaN;

    // 1. Validate latitude & longitude
    if (!Number.isFinite(latN) || !Number.isFinite(lngN) || latN < -90 || latN > 90 || lngN < -180 || lngN > 180) {
      res.status(400).json({
        success: false,
        error: 'latitude (-90 to 90) and longitude (-180 to 180) must be valid numbers'
      });
      return;
    }

    // 2. Validate radiusMeters if provided
    let radiusN = 1500;
    if (radiusMeters !== undefined) {
      const r = Number(radiusMeters);
      if (!Number.isFinite(r) || r <= 0 || r > 50000) {
        res.status(400).json({
          success: false,
          error: 'radiusMeters must be a positive number up to 50000'
        });
        return;
      }
      radiusN = r;
    }

    // 3. Validate carrier_id if provided
    let carrierIdN: number | undefined;
    if (carrier_id !== undefined) {
      const cId = Number(carrier_id);
      if (!Number.isFinite(cId) || cId <= 0) {
        res.status(400).json({
          success: false,
          error: 'carrier_id must be a valid positive integer'
        });
        return;
      }

      const carrierRecord = await CarrierModel.findById(cId);
      if (!carrierRecord || !carrierRecord.is_active) {
        res.status(400).json({
          success: false,
          error: `Carrier ID ${cId} is invalid or inactive`
        });
        return;
      }
      carrierIdN = cId;
    }

    // Fetch nearby coverage summaries (max age 7 days for live recommendations)
    const nearby = await CoverageSummaryModel.findNearby({
      latitude: latN,
      longitude: lngN,
      radiusMeters: radiusN,
      carrierId: carrierIdN,
      maxAgeDays: 7,
      limit: 20,
    });

    const now = Date.now();

    // Enrich nearby results with location resolution and freshness metadata
    const enrichedNearby = await Promise.all(
      nearby.map(async (row: any) => {
        let placeName = row.place_name;
        let formattedAddress = row.formatted_address;
        let googlePlaceId = row.google_place_id;

        const hasLabel =
          (placeName && String(placeName).trim().length > 0) ||
          (formattedAddress && String(formattedAddress).trim().length > 0);

        if (!hasLabel) {
          const lat = Number(row.average_latitude);
          const lng = Number(row.average_longitude);
          if (Number.isFinite(lat) && Number.isFinite(lng)) {
            try {
              const resolved = await resolveLocation(lat, lng);
              placeName = resolved.place_name ?? null;
              formattedAddress = resolved.formatted_address ?? null;
              googlePlaceId = resolved.google_place_id ?? null;
            } catch {
              // Resolution is best effort
            }
          }
        }

        // Calculate freshness metadata
        const lastTimeIso = row.last_measurement_at || row.last_updated;
        const lastTimestamp = lastTimeIso ? new Date(lastTimeIso).getTime() : now;
        const ageSeconds = Math.max(0, Math.floor((now - lastTimestamp) / 1000));

        let freshnessState: 'fresh' | 'recent' | 'today' | 'older' | 'historical' = 'fresh';
        if (ageSeconds > 604800) freshnessState = 'historical';
        else if (ageSeconds > 86400) freshnessState = 'older';
        else if (ageSeconds > 3600) freshnessState = 'today';
        else if (ageSeconds > 600) freshnessState = 'recent';

        // Sample count confidence label
        const count = Number(row.measurement_count || 0);
        let confidenceLabel = 'Normal';
        if (count <= 1) confidenceLabel = 'Initial report';
        else if (count <= 4) confidenceLabel = 'Limited data';

        return {
          ...row,
          place_name: placeName,
          formatted_address: formattedAddress,
          google_place_id: googlePlaceId,
          data_age_seconds: ageSeconds,
          freshness_state: freshnessState,
          is_historical: ageSeconds > 604800,
          confidence_label: confidenceLabel,
        };
      })
    );

    res.status(200).json({
      success: true,
      query: {
        latitude: latN,
        longitude: lngN,
        radius_meters: radiusN,
        carrier_id: carrierIdN || null,
      },
      nearby: enrichedNearby
    });
  } catch (err: any) {
    console.error('❌ Get Nearby Coverage Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch nearby coverage summaries',
      message: err.message
    });
  }
};




// ==================== ANALYTICS ENDPOINTS ====================


// GET /api/hotspot/analytics/building/:buildingId - Get analytics for a building
export const getBuildingAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { buildingId } = req.params;
    const { carrier_id } = req.query;

    // Get measurement count
    const measurementCount = await MeasurementModel.countByBuilding(
      parseInt(buildingId),
      carrier_id ? Number(carrier_id) : undefined
    );

    // Get coverage summary
    const coverage = await CoverageSummaryModel.findByBuilding(
      parseInt(buildingId),
      carrier_id ? Number(carrier_id) : undefined
    );

    // Prefer Google place_name when available for analytics.
    // coverage is sourced from hotspot_coverage_summary; we enrich it with the latest
    // hotspot_measurements row per room_id/building_id that has place_name.
    const enrichedCoverage = [] as any[];
    for (const row of coverage as any[]) {
      let place_name: string | null = null;
      let formatted_address: string | null = null;
      let google_place_id: string | null = null;

      if (row.room_id) {
        const q = `
          SELECT place_name, formatted_address, google_place_id
          FROM hotspot_measurements
          WHERE room_id = $1 AND place_name IS NOT NULL
          ORDER BY measurement_timestamp DESC
          LIMIT 1
        `;
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { pool } = await import('../db.js');
        const r = await pool.query(q, [row.room_id]);
        if (r.rows[0]) {
          place_name = r.rows[0].place_name;
          formatted_address = r.rows[0].formatted_address;
          google_place_id = r.rows[0].google_place_id;
        }
      } else if (row.building_id) {
        const q = `
          SELECT place_name, formatted_address, google_place_id
          FROM hotspot_measurements
          WHERE building_id = $1 AND place_name IS NOT NULL
          ORDER BY measurement_timestamp DESC
          LIMIT 1
        `;
        const r = await (await import('../db.js')).pool.query(q, [row.building_id]);
        if (r.rows[0]) {
          place_name = r.rows[0].place_name;
          formatted_address = r.rows[0].formatted_address;
          google_place_id = r.rows[0].google_place_id;
        }
      }

      enrichedCoverage.push({
        ...row,
        place_name,
        formatted_address,
        google_place_id,
      });
    }

    res.status(200).json({
      success: true,
      analytics: {
        measurement_count: measurementCount,
        coverage_summary: enrichedCoverage
      }
    });
  } catch (err: any) {
    console.error('❌ Get Building Analytics Error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch building analytics',
      message: err.message
    });
  }
};
