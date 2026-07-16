import { Request, Response } from 'express';
import { pool } from '../db.js';
import { handleControllerError } from '../utils/apiError.js';

const toFiniteNumber = (v: any): number | null => {
  if (v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/**
 * Public debug endpoint to validate the hotspot recommendation pipeline.
 *
 * Returns:
 * - measurements_in_radius: count of raw hotspot_measurements within radius
 * - coverage_rows_total: total rows in hotspot_coverage_summary
 * - coverage_rows_with_centroid: rows where average_latitude/average_longitude are both non-null
 * - coverage_rows_with_measurements: rows where measurement_count > 0
 * - nearest_coverage_by_distance: nearest coverage rows by distance computation
 */
export const debugNearby = async (req: Request, res: Response): Promise<void> => {
  try {

    const latitude = toFiniteNumber(req.query.latitude);
    const longitude = toFiniteNumber(req.query.longitude);
    const radiusMeters = req.query.radiusMeters !== undefined ? toFiniteNumber(req.query.radiusMeters) : null;
    const carrierId = req.query.carrier_id !== undefined ? toFiniteNumber(req.query.carrier_id) : null;

    if (latitude === null || longitude === null) {
      res.status(400).json({
        success: false,
        error: 'latitude and longitude are required and must be valid numbers',
      });
      return;
    }

    const r = radiusMeters ?? 1500;

    // We keep params positional:
    // $1 lat, $2 lng, $3 radius
    // optionally $4 carrier_id (only when carrierId is provided)
    const carrierClauseM = carrierId !== null ? 'AND m.carrier_id = $4' : '';
    const carrierClauseCS = carrierId !== null ? 'AND cs.carrier_id = $4' : '';

    const paramsBase: any[] = [latitude, longitude, r];
    const paramsM = carrierId !== null ? [...paramsBase, carrierId] : paramsBase;
    const paramsCS = carrierId !== null ? [...paramsBase, carrierId] : paramsBase;


    const measurementsInRadiusQuery = `
      SELECT COUNT(*)::int AS measurements_in_radius
      FROM hotspot_measurements m
      WHERE m.latitude IS NOT NULL
        AND m.longitude IS NOT NULL
        AND (
          6371000 * acos(
            LEAST(1.0, GREATEST(-1.0,
              cos(radians($1)) * cos(radians(m.latitude)) *
              cos(radians(m.longitude) - radians($2)) +
              sin(radians($1)) * sin(radians(m.latitude))
            ))
        ) <= $3
        ${carrierClauseM}
    `;

    const coverageTotalsQuery = `
      SELECT
        COUNT(*)::int AS coverage_rows_total,
        SUM(CASE WHEN average_latitude IS NOT NULL AND average_longitude IS NOT NULL THEN 1 ELSE 0 END)::int AS coverage_rows_with_centroid,
        SUM(CASE WHEN measurement_count > 0 THEN 1 ELSE 0 END)::int AS coverage_rows_with_measurements
      FROM hotspot_coverage_summary cs
      WHERE 1=1
        ${carrierClauseCS}
    `;

    const nearestCoverageQuery = `
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
        ) AS distance_meters
      FROM hotspot_coverage_summary cs
      LEFT JOIN hotspot_carriers c ON c.id = cs.carrier_id
      WHERE cs.average_latitude IS NOT NULL
        AND cs.average_longitude IS NOT NULL
        AND cs.measurement_count > 0
        ${carrierClauseCS}
      ORDER BY distance_meters ASC
      LIMIT 10
    `;

    const [mInRadiusRes, covTotalsRes, nearestRes] = await Promise.all([
      pool.query(measurementsInRadiusQuery, paramsM),
      pool.query(coverageTotalsQuery, paramsCS),
      pool.query(nearestCoverageQuery, paramsCS),
    ]);

    // Log key facts so we can see why nearby returns empty even without client-side debug UI.
    console.log('[Hotspot][DebugNearby] input', { latitude, longitude, radiusMeters: r, carrierId });
    console.log('[Hotspot][DebugNearby] counts', {
      measurements_in_radius: mInRadiusRes.rows[0]?.measurements_in_radius ?? 0,
      coverage_rows_total: covTotalsRes.rows[0]?.coverage_rows_total ?? 0,
      coverage_rows_with_centroid: covTotalsRes.rows[0]?.coverage_rows_with_centroid ?? 0,
      coverage_rows_with_measurements: covTotalsRes.rows[0]?.coverage_rows_with_measurements ?? 0,
    });


    res.status(200).json({
      success: true,
      input: { latitude, longitude, radiusMeters: r, carrier_id: carrierId },
      measurements_in_radius: mInRadiusRes.rows[0]?.measurements_in_radius ?? 0,
      coverage_totals: {
        coverage_rows_total: covTotalsRes.rows[0]?.coverage_rows_total ?? 0,
        coverage_rows_with_centroid: covTotalsRes.rows[0]?.coverage_rows_with_centroid ?? 0,
        coverage_rows_with_measurements: covTotalsRes.rows[0]?.coverage_rows_with_measurements ?? 0,
      },
      nearest_coverage_by_distance: nearestRes.rows,
    });
  } catch (err: any) {
    console.error('❌ debugNearby Error:', err);
    handleControllerError(res, err, {
      statusCode: 500,
      publicError: 'debugNearby failed',
      context: 'hotspot/debugNearby',
    });
  }
};
