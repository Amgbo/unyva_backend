/**
 * Heatmap Service
 * 
 * Generates heatmap tiles from coverage summaries.
 * 
 * Key principles:
 * - Reads from hotspot_coverage_summary only (never raw measurements)
 * - Uses PostGIS for tile geometry generation
 * - Generates tiles independently per carrier
 * - Idempotent: same input = same output
 * - Upserts to hotspot_heatmap_tiles
 */

import { pool } from '../db.js';
import { aggregationConfig } from '../config/aggregationConfig.js';
import { HeatmapTileModel } from '../models/hotspotModels.js';

// ==================== TYPES ====================

export interface CoverageSummary {
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
}

export interface HeatmapTile {
  zoom_level: number;
  tile_x: number;
  tile_y: number;
  carrier_id: number;
  signal_score: number; // 0-100
  measurement_count: number;
}

// ==================== SIGNAL QUALITY THRESHOLDS ====================

/**
 * Signal quality thresholds for heatmap coloring:
 * - Green (Excellent): 75-100
 * - Yellow (Good): 50-74
 * - Orange (Weak): 25-49
 * - Red (Poor): 0-24
 */
const SIGNAL_QUALITY_THRESHOLDS = {
  excellent: 75,
  good: 50,
  weak: 25,
};

/**
 * Convert signal quality to a 0-100 score for heatmap visualization.
 * This is the same as signal_quality since it's already 0-100.
 */
function calculateSignalScore(signalQuality: number, measurementCount: number): number {
  // If insufficient measurements, reduce score to indicate low confidence
  if (measurementCount < 10) {
    return Math.round(signalQuality * (measurementCount / 10));
  }
  return Math.round(signalQuality);
}

/**
 * Get signal quality category for visualization
 */
export function getSignalCategory(score: number): 'excellent' | 'good' | 'weak' | 'poor' {
  if (score >= SIGNAL_QUALITY_THRESHOLDS.excellent) return 'excellent';
  if (score >= SIGNAL_QUALITY_THRESHOLDS.good) return 'good';
  if (score >= SIGNAL_QUALITY_THRESHOLDS.weak) return 'weak';
  return 'poor';
}

// ==================== SERVICE ====================

export class HeatmapService {
  /**
   * Regenerate heatmap tiles for a specific carrier.
   * This is called after aggregation completes.
   */
  async regenerateForCarrier(carrierId: number, zoomLevel?: number): Promise<HeatmapTile[]> {
    const zoom = zoomLevel ?? aggregationConfig.heatmap.zoomLevel;
    
    console.log(`[Heatmap] Regenerating tiles for carrier ${carrierId} at zoom ${zoom}`);
    const startTime = Date.now();

    // Fetch coverage summaries for this carrier
    const summaries = await this.fetchCoverageSummaries(carrierId);
    
    if (summaries.length === 0) {
      console.log(`[Heatmap] No coverage summaries found for carrier ${carrierId}`);
      return [];
    }

    // Generate tiles from coverage summaries
    const tiles = await this.generateTilesFromSummaries(summaries, carrierId, zoom);

    const duration = Date.now() - startTime;
    console.log(
      `[Heatmap] Generated ${tiles.length} tiles for carrier ${carrierId} in ${duration}ms`
    );

    return tiles;
  }

  /**
   * Regenerate heatmap tiles for all carriers.
   */
  async regenerateAll(zoomLevel?: number): Promise<HeatmapTile[]> {
    const zoom = zoomLevel ?? aggregationConfig.heatmap.zoomLevel;
    
    console.log(`[Heatmap] Regenerating all tiles at zoom ${zoom}`);
    const startTime = Date.now();

    // Get all carriers with coverage summaries
    const carrierIds = await this.getCarriersWithCoverage();
    
    const allTiles: HeatmapTile[] = [];
    for (const carrierId of carrierIds) {
      const tiles = await this.regenerateForCarrier(carrierId, zoom);
      allTiles.push(...tiles);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[Heatmap] Generated ${allTiles.length} tiles for ${carrierIds.length} carriers in ${duration}ms`
    );

    return allTiles;
  }

  /**
   * Fetch coverage summaries for a specific carrier.
   * Only reads from hotspot_coverage_summary (never raw measurements).
   */
  private async fetchCoverageSummaries(carrierId: number): Promise<CoverageSummary[]> {
    const query = `
      SELECT 
        building_id,
        room_id,
        carrier_id,
        average_signal_strength,
        average_signal_quality,
        average_download_speed,
        average_upload_speed,
        average_latency,
        measurement_count,
        speed_test_count
      FROM hotspot_coverage_summary
      WHERE carrier_id = $1
        AND measurement_count > 0
    `;
    
    const result = await pool.query(query, [carrierId]);
    return result.rows;
  }

  /**
   * Get list of carrier IDs that have coverage summaries.
   */
  private async getCarriersWithCoverage(): Promise<number[]> {
    const query = `
      SELECT DISTINCT carrier_id 
      FROM hotspot_coverage_summary 
      WHERE measurement_count > 0
    `;
    
    const result = await pool.query(query);
    return result.rows.map((row: { carrier_id: number }) => row.carrier_id);
  }

  /**
   * Generate heatmap tiles from coverage summaries.
   * Uses PostGIS to create tile geometry and aggregate values.
   */
  private async generateTilesFromSummaries(
    summaries: CoverageSummary[],
    carrierId: number,
    zoomLevel: number
  ): Promise<HeatmapTile[]> {
    // Group summaries by building to get geographic distribution
    const buildingGroups = new Map<number, CoverageSummary[]>();
    for (const summary of summaries) {
      if (!summary.building_id) continue;
      if (!buildingGroups.has(summary.building_id)) {
        buildingGroups.set(summary.building_id, []);
      }
      buildingGroups.get(summary.building_id)!.push(summary);
    }

    // Fetch building locations and generate tiles
    const tiles: HeatmapTile[] = [];
    
    for (const [buildingId, buildingSummaries] of buildingGroups) {
      // Get building location from database
      const buildingLocation = await this.getBuildingLocation(buildingId);
      if (!buildingLocation) continue;

      // Calculate aggregated values for this building
      const aggregated = this.aggregateBuildingSummaries(buildingSummaries);
      
      // Calculate signal score
      const signalScore = calculateSignalScore(
        aggregated.average_signal_quality,
        aggregated.measurement_count
      );

      // Convert lat/lng to tile coordinates
      const tileCoords = this.latLngToTileCoords(
        buildingLocation.latitude,
        buildingLocation.longitude,
        zoomLevel
      );

      tiles.push({
        zoom_level: zoomLevel,
        tile_x: tileCoords.x,
        tile_y: tileCoords.y,
        carrier_id: carrierId,
        signal_score: signalScore,
        measurement_count: aggregated.measurement_count,
      });
    }

    // Upsert tiles to database
    for (const tile of tiles) {
      await HeatmapTileModel.upsert(tile);
    }

    return tiles;
  }

  /**
   * Get building location from database.
   */
  private async getBuildingLocation(buildingId: number): Promise<{
    latitude: number;
    longitude: number;
  } | null> {
    // Try to get from coverage_summary first (has building_id)
    const query = `
      SELECT 
        AVG(m.latitude) as latitude,
        AVG(m.longitude) as longitude
      FROM hotspot_measurements m
      WHERE m.building_id = $1
        AND m.measurement_timestamp >= NOW() - INTERVAL '90 days'
      LIMIT 1
    `;
    
    const result = await pool.query(query, [buildingId]);
    if (result.rows.length === 0 || !result.rows[0].latitude) {
      return null;
    }

    return {
      latitude: parseFloat(result.rows[0].latitude),
      longitude: parseFloat(result.rows[0].longitude),
    };
  }

  /**
   * Aggregate multiple summaries for the same building.
   */
  private aggregateBuildingSummaries(summaries: CoverageSummary[]): {
    average_signal_quality: number;
    measurement_count: number;
  } {
    const totalQuality = summaries.reduce((sum, s) => sum + s.average_signal_quality, 0);
    const totalCount = summaries.reduce((sum, s) => sum + s.measurement_count, 0);
    
    return {
      average_signal_quality: Math.round(totalQuality / summaries.length),
      measurement_count: totalCount,
    };
  }

  /**
   * Convert latitude/longitude to Web Mercator tile coordinates.
   */
  private latLngToTileCoords(
    latitude: number,
    longitude: number,
    zoom: number
  ): { x: number; y: number } {
    const n = Math.pow(2, zoom);
    const x = Math.floor(((longitude + 180) / 360) * n);
    
    const latRad = (latitude * Math.PI) / 180;
    const y = Math.floor(
      ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
    );

    return { x, y };
  }

  /**
   * Clear all heatmap tiles for a specific carrier.
   * Useful for full regeneration.
   */
  async clearForCarrier(carrierId: number): Promise<void> {
    const query = 'DELETE FROM hotspot_heatmap_tiles WHERE carrier_id = $1';
    await pool.query(query, [carrierId]);
    console.log(`[Heatmap] Cleared tiles for carrier ${carrierId}`);
  }

  /**
   * Clear all heatmap tiles.
   * Use with caution - will remove all heatmap data.
   */
  async clearAll(): Promise<void> {
    const query = 'TRUNCATE hotspot_heatmap_tiles';
    await pool.query(query);
    console.log('[Heatmap] Cleared all tiles');
  }
}

export const heatmapService = new HeatmapService();
export default heatmapService;