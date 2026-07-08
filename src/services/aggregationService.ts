/**
 * Aggregation Service
 * 
 * Transforms raw network measurements into coverage summaries.
 * 
 * Key principles:
 * - Always recompute from raw measurements (never use previous summaries)
 * - Idempotent: same input = same output
 * - Independent aggregation per geographic level (building, floor, room)
 * - Minimum sample thresholds before publishing summaries
 */

import { pool } from '../db.js';
import { aggregationConfig } from '../config/aggregationConfig.js';
import {
  calculateWeightedSignalStrength,
  calculateWeightedSignalQuality,
  calculateWeightedDownloadSpeed,
  calculateWeightedUploadSpeed,
  calculateWeightedLatency,
  calculateConfidence,
  calculateConsistency,
  calculateReliability,
  getMostRecentAgeDays,
  Measurement as WeightedMeasurement,
} from '../utils/timeWeighting.js';
import { CoverageSummaryModel } from '../models/hotspotModels.js';
import { resolveLocation } from './locationResolutionService.js';

// ==================== TYPES ====================

export interface RawMeasurement {
  signal_strength: number | null;
  signal_quality: number;
  network_type: string;
  carrier_id: number;
  measurement_timestamp: Date;
  latitude?: number | null;
  longitude?: number | null;
  download_speed?: number | null;
  upload_speed?: number | null;
  latency?: number | null;
  place_name?: string | null;
  formatted_address?: string | null;
  google_place_id?: string | null;
}

export interface AggregationGroup {
  carrier_id: number;
  network_type: string;
  measurements: RawMeasurement[];
  // GPS-first centroid of the group
  average_latitude: number | null;
  average_longitude: number | null;
  // Representative place label from the most recent measurement in the group
  place_name: string | null;
  formatted_address: string | null;
  google_place_id: string | null;
}

export interface AggregationResult {
  building_id?: number;
  floor_id?: number;
  room_id?: number;
  carrier_id: number;
  network_type: string;
  average_signal_strength: number | null;
  average_signal_quality: number;
  average_download_speed: number | null;
  average_upload_speed: number | null;
  average_latency: number | null;
  measurement_count: number;
  speed_test_count: number;
  confidence_score: number;
  reliability_score: number;
  average_latitude: number | null;
  average_longitude: number | null;
  place_name: string | null;
  formatted_address: string | null;
  google_place_id: string | null;
  last_measurement_at: Date | null;
}

// ==================== MINIMUM THRESHOLDS ====================

const MIN_SAMPLES = {
  gps_cluster: 1,
};

// Spatial clustering: group measurements that are within this many meters of each other.
// This creates location-specific crowdsourced summaries without needing building/room IDs.
const GPS_CLUSTER_RADIUS_METERS = 50;

// ==================== QUERY BUILDERS ====================

/**
 * Fetch raw measurements for GPS-first aggregation.
 * No building_id/room_id required. We aggregate by carrier + network type + GPS cluster.
 */
const GPS_MEASUREMENTS_QUERY = `
  SELECT 
    m.signal_strength,
    m.signal_quality,
    m.network_type,
    m.carrier_id,
    m.measurement_timestamp,
    m.latitude,
    m.longitude,
    m.place_name,
    m.formatted_address,
    m.google_place_id,
    st.download_speed,
    st.upload_speed,
    st.latency
  FROM hotspot_measurements m
  LEFT JOIN hotspot_speed_tests st ON st.measurement_id = m.id
  WHERE m.measurement_timestamp >= NOW() - INTERVAL '90 days'
  ORDER BY m.carrier_id, m.network_type, m.measurement_timestamp DESC
`;

// ==================== SERVICE ====================

export class AggregationService {
  /**
   * Aggregate all recent measurements into GPS-based clusters.
   * This is the main entry point for aggregation.
   */
  async aggregateAll(): Promise<{
    clusters: AggregationResult[];
    touchedCarrierIds: number[];
  }> {
    console.log('[Aggregation] Starting GPS-first aggregation');
    const startTime = Date.now();

    const result = await pool.query(GPS_MEASUREMENTS_QUERY);
    const measurements = result.rows as RawMeasurement[];

    if (measurements.length === 0) {
      console.log('[Aggregation] No measurements to aggregate');
      return { clusters: [], touchedCarrierIds: [] };
    }

    // Group by carrier + network type
    const carrierNetworkGroups = this.groupByCarrierAndNetworkType(measurements);
    const allClusters: AggregationResult[] = [];

    for (const group of carrierNetworkGroups) {
      // Further split each carrier/network group into GPS clusters
      const clusters = this.clusterByGps(group);

      for (const cluster of clusters) {
        if (cluster.measurements.length < MIN_SAMPLES.gps_cluster) {
          continue;
        }

        const summary = this.computeSummary({
          carrier_id: cluster.carrier_id,
          network_type: cluster.network_type,
          measurements: cluster.measurements,
          average_latitude: cluster.average_latitude,
          average_longitude: cluster.average_longitude,
          place_name: cluster.place_name,
          formatted_address: cluster.formatted_address,
          google_place_id: cluster.google_place_id,
        });

        if (
          (!summary.place_name || !String(summary.place_name).trim()) &&
          summary.average_latitude != null &&
          summary.average_longitude != null
        ) {
          const resolved = await resolveLocation(summary.average_latitude, summary.average_longitude);
          summary.place_name = resolved.place_name;
          summary.formatted_address = resolved.formatted_address;
          summary.google_place_id = resolved.google_place_id;
        }

        allClusters.push(summary);
        await this.upsertSummary(summary);
      }
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Aggregation] Completed GPS-first aggregation in ${duration}ms: ${allClusters.length} clusters`
    );

    const carrierSet = new Set<number>();
    for (const s of allClusters) carrierSet.add(s.carrier_id);

    return { clusters: allClusters, touchedCarrierIds: Array.from(carrierSet.values()) };
  }

  /**
   * Backwards-compatible entry point: aggregate measurements that are near a given building.
   * In GPS-first mode this simply re-runs the global aggregation.
   */
  async aggregateForBuilding(_buildingId: number): Promise<{
    building: AggregationResult[];
    floors: AggregationResult[];
    rooms: AggregationResult[];
    touchedCarrierIds: number[];
  }> {
    const { clusters, touchedCarrierIds } = await this.aggregateAll();
    return { building: clusters, floors: [], rooms: [], touchedCarrierIds };
  }

  /**
   * Group measurements by carrier_id and network_type.
   */
  private groupByCarrierAndNetworkType(measurements: RawMeasurement[]): AggregationGroup[] {
    const groups = new Map<string, AggregationGroup>();

    for (const m of measurements) {
      const key = `${m.carrier_id}_${m.network_type}`;
      if (!groups.has(key)) {
        groups.set(key, {
          carrier_id: m.carrier_id,
          network_type: m.network_type as '2G' | '3G' | '4G' | '5G' | 'LTE',
          measurements: [],
          average_latitude: null,
          average_longitude: null,
          place_name: null,
          formatted_address: null,
          google_place_id: null,
        });
      }
      groups.get(key)!.measurements.push(m);
    }

    return Array.from(groups.values());
  }

  /**
   * Cluster a group of measurements by geographic proximity.
   * Uses a simple greedy clustering algorithm based on the configured radius.
   */
  private clusterByGps(group: AggregationGroup): AggregationGroup[] {
    const clusters: AggregationGroup[] = [];
    const remaining = group.measurements.slice();

    while (remaining.length > 0) {
      const seed = remaining.shift()!;
      const clusterMeasurements: RawMeasurement[] = [seed];
      const seedLat = Number(seed.latitude);
      const seedLng = Number(seed.longitude);

      if (!Number.isFinite(seedLat) || !Number.isFinite(seedLng)) {
        // No valid GPS for this measurement; skip it
        continue;
      }

      for (let i = remaining.length - 1; i >= 0; i--) {
        const m = remaining[i];
        const lat = Number(m.latitude);
        const lng = Number(m.longitude);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          remaining.splice(i, 1);
          continue;
        }

        const distance = this.haversineDistanceMeters(seedLat, seedLng, lat, lng);
        if (distance <= GPS_CLUSTER_RADIUS_METERS) {
          clusterMeasurements.push(m);
          remaining.splice(i, 1);
        }
      }

      // Compute cluster centroid
      const avgLat = clusterMeasurements.reduce((sum, m) => sum + Number(m.latitude), 0) / clusterMeasurements.length;
      const avgLng = clusterMeasurements.reduce((sum, m) => sum + Number(m.longitude), 0) / clusterMeasurements.length;

      // Pick the most recent measurement with a place_name as the representative label
      const representative = clusterMeasurements
        .slice()
        .sort((a, b) => new Date(b.measurement_timestamp).getTime() - new Date(a.measurement_timestamp).getTime())
        .find(m => m.place_name) || clusterMeasurements[0];

      clusters.push({
        carrier_id: group.carrier_id,
        network_type: group.network_type,
        measurements: clusterMeasurements,
        average_latitude: avgLat,
        average_longitude: avgLng,
        place_name: representative?.place_name ?? null,
        formatted_address: representative?.formatted_address ?? null,
        google_place_id: representative?.google_place_id ?? null,
      });
    }

    return clusters;
  }

  /**
   * Haversine distance in meters between two lat/lng points.
   */
  private haversineDistanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lng2 - lng1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Compute summary metrics from a group of measurements.
   * All metrics are recomputed from raw measurements.
   */
  private computeSummary(params: {
    building_id?: number;
    floor_id?: number;
    room_id?: number;
    carrier_id: number;
    network_type: string;
    measurements: RawMeasurement[];
    average_latitude: number | null;
    average_longitude: number | null;
    place_name: string | null;
    formatted_address: string | null;
    google_place_id: string | null;
  }): AggregationResult {
    const { measurements } = params;

    // Convert to weighted measurement format
    const weightedMeasurements: WeightedMeasurement[] = measurements.map(m => ({
      measurement_timestamp: m.measurement_timestamp.toISOString(),
      signal_strength: m.signal_strength,
      signal_quality: m.signal_quality,
      download_speed: m.download_speed ?? undefined,
      upload_speed: m.upload_speed ?? undefined,
      latency: m.latency ?? undefined,
    }));

    // Calculate weighted averages
    const signalStrengthResult = calculateWeightedSignalStrength(weightedMeasurements);
    const signalQualityResult = calculateWeightedSignalQuality(weightedMeasurements);
    const downloadSpeedResult = calculateWeightedDownloadSpeed(weightedMeasurements);
    const uploadSpeedResult = calculateWeightedUploadSpeed(weightedMeasurements);
    const latencyResult = calculateWeightedLatency(weightedMeasurements);

    // Count speed tests (measurements that have speed test data)
    const speedTestCount = measurements.filter(m =>
      m.download_speed != null && m.upload_speed != null && m.latency != null
    ).length;

    // Calculate consistency
    const consistency = calculateConsistency(weightedMeasurements);

    // Calculate most recent age
    const mostRecentAgeDays = getMostRecentAgeDays(weightedMeasurements);

    // GPS-first clusters use a single coverage area type
    const coverageArea: 'building' = 'building';

    // Calculate confidence
    const confidence = calculateConfidence(
      signalStrengthResult.effectiveSampleCount,
      mostRecentAgeDays,
      coverageArea
    );

    // Calculate reliability
    const reliability = calculateReliability(
      signalQualityResult.value,
      confidence,
      consistency.coefficientOfVariation
    );

    const lastMeasurementAt = measurements.reduce<Date | null>((latest, m) => {
      if (!latest || m.measurement_timestamp > latest) return m.measurement_timestamp;
      return latest;
    }, null);

    return {
      building_id: params.building_id,
      floor_id: params.floor_id,
      room_id: params.room_id,
      carrier_id: params.carrier_id,
      network_type: params.network_type as '2G' | '3G' | '4G' | '5G' | 'LTE',
      average_signal_strength: signalStrengthResult.value,
      average_signal_quality: Math.round(signalQualityResult.value),
      average_download_speed: downloadSpeedResult.value !== 0 ? Math.round(downloadSpeedResult.value * 10) / 10 : null,
      average_upload_speed: uploadSpeedResult.value !== 0 ? Math.round(uploadSpeedResult.value * 10) / 10 : null,
      average_latency: latencyResult.value !== 0 ? Math.round(latencyResult.value) : null,
      measurement_count: measurements.length,
      speed_test_count: speedTestCount,
      confidence_score: Math.round(confidence * 100),
      reliability_score: reliability,
      average_latitude: params.average_latitude,
      average_longitude: params.average_longitude,
      place_name: params.place_name,
      formatted_address: params.formatted_address,
      google_place_id: params.google_place_id,
      last_measurement_at: lastMeasurementAt,
    };
  }

  /**
   * Upsert a coverage summary to the database.
   */
  private async upsertSummary(summary: AggregationResult): Promise<void> {
    try {
      await CoverageSummaryModel.upsert({
        building_id: summary.building_id,
        room_id: summary.room_id,
        carrier_id: summary.carrier_id,
        average_signal_strength: summary.average_signal_strength ?? 0,
        average_signal_quality: summary.average_signal_quality,
        average_download_speed: summary.average_download_speed ?? undefined,
        average_upload_speed: summary.average_upload_speed ?? undefined,
        average_latency: summary.average_latency ?? undefined,
        measurement_count: summary.measurement_count,
        speed_test_count: summary.speed_test_count,
        average_latitude: summary.average_latitude ?? undefined,
        average_longitude: summary.average_longitude ?? undefined,
        confidence_score: summary.confidence_score,
        reliability_score: summary.reliability_score,
        place_name: summary.place_name,
        formatted_address: summary.formatted_address,
        google_place_id: summary.google_place_id,
        last_measurement_at: summary.last_measurement_at ?? undefined,
      });
    } catch (error: any) {
      console.error(
        `[Aggregation] Failed to upsert summary for carrier=${summary.carrier_id}, lat=${summary.average_latitude}, lng=${summary.average_longitude}:`,
        error
      );
      throw error;
    }
  }
}

export const aggregationService = new AggregationService();
export default aggregationService;
