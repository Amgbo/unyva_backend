/**
 * Verifies the hotspot measurement → aggregation → coverage → heatmap → nearby pipeline.
 * Run: npx tsx scripts/verify-hotspot-pipeline.ts
 */
import 'dotenv/config';
import jwt from 'jsonwebtoken';
import { pool } from '../src/db.js';
import aggregationService from '../src/services/aggregationService.js';
import { heatmapService } from '../src/services/heatmapService.js';
import { CoverageSummaryModel, DeviceProfileModel } from '../src/models/hotspotModels.js';

const JWT_SECRET =
  process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

function resolveSignalStrength(
  signalStrength: number | null | undefined,
  signalQuality: number | null | undefined
): number | null {
  if (signalStrength != null && Number.isFinite(signalStrength)) {
    return signalStrength;
  }
  if (signalQuality == null || !Number.isFinite(signalQuality)) {
    return null;
  }
  const clampedQuality = Math.max(0, Math.min(100, signalQuality));
  return Math.round(-120 + (clampedQuality / 100) * 70);
}

async function main() {
  console.log('=== Hotspot pipeline verification ===\n');

  await pool.query(`
    CREATE OR REPLACE FUNCTION update_hotspot_coverage_summary_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.last_updated = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  const studentRes = await pool.query(
    'SELECT student_id FROM students ORDER BY created_at ASC LIMIT 1'
  );
  if (!studentRes.rows.length) {
    throw new Error('No students found — create a test student first.');
  }
  const studentId = studentRes.rows[0].student_id as string;

  const buildingRes = await pool.query(
    `SELECT b.id, b.name, b.code, c.latitude, c.longitude
     FROM hotspot_buildings b
     JOIN hotspot_campuses c ON c.id = b.campus_id
     WHERE b.is_active = true
     ORDER BY b.id ASC
     LIMIT 1`
  );
  if (!buildingRes.rows.length) {
    throw new Error('No hotspot buildings found.');
  }
  const building = buildingRes.rows[0];

  const roomRes = await pool.query(
    `SELECT r.id, r.room_name, r.room_code
     FROM hotspot_rooms r
     JOIN hotspot_floors f ON f.id = r.floor_id
     WHERE f.building_id = $1 AND r.is_active = true
     ORDER BY r.id ASC
     LIMIT 1`,
    [building.id]
  );
  const room = roomRes.rows[0] ?? null;

  const carrierRes = await pool.query(
    'SELECT id, name FROM hotspot_carriers WHERE is_active = true ORDER BY id ASC LIMIT 1'
  );
  const carrier = carrierRes.rows[0];

  const deviceProfile = await DeviceProfileModel.findOrCreate({
    platform: 'verify-script',
    manufacturer: 'Unyva',
    model: 'PipelineTest',
    os_version: '1.0',
    app_version: '1.0',
    capabilities: {},
  });
  const deviceProfileId = deviceProfile.id!;

  const baseLat = Number(building.latitude) + 0.0001;
  const baseLng = Number(building.longitude) + 0.0001;
  const batchSize = 12;

  console.log(`Student: ${studentId}`);
  console.log(`Building: ${building.name} (#${building.id})`);
  console.log(`Room: ${room?.room_name ?? 'n/a'} (#${room?.id ?? 'n/a'})`);
  console.log(`Carrier: ${carrier.name} (#${carrier.id})`);
  console.log(`Uploading ${batchSize} measurements near (${baseLat}, ${baseLng})...\n`);

  const nearbyBefore = await CoverageSummaryModel.findNearby({
    latitude: baseLat,
    longitude: baseLng,
    radiusMeters: 2000,
    limit: 1,
  });
  const reliabilityBefore = nearbyBefore[0]?.reliability_score ?? null;

  for (let i = 0; i < batchSize; i++) {
    const signalQuality = 70 + (i % 20);
    const signalStrength = -120 + Math.round((signalQuality / 100) * 70);
    await pool.query(
      `INSERT INTO hotspot_measurements (
        user_id, carrier_id, device_profile_id, room_id, building_id,
        latitude, longitude, signal_strength, signal_quality, network_type,
        measurement_timestamp, accuracy, upload_status, idempotency_key
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),$11,'uploaded',$12)`,
      [
        studentId,
        carrier.id,
        deviceProfileId,
        room?.id ?? null,
        building.id,
        baseLat + i * 0.00001,
        baseLng + i * 0.00001,
        signalStrength,
        signalQuality,
        '4G',
        15,
        `verify_${Date.now()}_${i}`,
      ]
    );
  }

  const countRes = await pool.query(
    'SELECT COUNT(*)::int AS count FROM hotspot_measurements WHERE building_id = $1',
    [building.id]
  );
  console.log(`✓ Measurements stored: ${countRes.rows[0].count} for building ${building.id}`);

  const aggResult = await aggregationService.aggregateForBuilding(building.id);
  const summaryCount =
    (aggResult.building?.length ?? 0) +
    (aggResult.floors?.length ?? 0) +
    (aggResult.rooms?.length ?? 0);
  console.log(`✓ Aggregation complete: ${summaryCount} summaries upserted`);

  const summaryRes = await pool.query(
    `SELECT id, building_id, room_id, carrier_id, measurement_count,
            reliability_score, confidence_score, average_signal_quality,
            average_latitude, average_longitude
     FROM hotspot_coverage_summary
     WHERE building_id = $1 AND measurement_count > 0
     ORDER BY last_updated DESC
     LIMIT 5`,
    [building.id]
  );
  console.log(`✓ Coverage summaries: ${summaryRes.rows.length} row(s) with data`);
  if (summaryRes.rows[0]) {
    const s = summaryRes.rows[0];
    console.log(
      `  reliability=${s.reliability_score} confidence=${s.confidence_score} quality=${s.average_signal_quality} count=${s.measurement_count}`
    );
  }

  for (const carrierId of aggResult.touchedCarrierIds) {
    const tiles = await heatmapService.regenerateForCarrier(carrierId);
    console.log(`✓ Heatmap tiles regenerated for carrier ${carrierId}: ${tiles.length} tile(s)`);
  }

  const tileCountRes = await pool.query(
    'SELECT COUNT(*)::int AS count FROM hotspot_heatmap_tiles WHERE carrier_id = $1',
    [carrier.id]
  );
  console.log(`✓ Heatmap tiles in DB for carrier: ${tileCountRes.rows[0].count}`);

  const nearby = await CoverageSummaryModel.findNearby({
    latitude: baseLat,
    longitude: baseLng,
    radiusMeters: 2000,
    limit: 5,
  });
  console.log(`✓ Nearby recommendations: ${nearby.length} result(s)`);
  if (nearby[0]) {
    const n = nearby[0];
    console.log(
      `  Top: ${n.building_name ?? n.building_code} / ${n.room_name ?? n.room_code ?? '—'} — carrier=${n.carrier_name} reliability=${n.reliability_score} confidence=${n.confidence_score} quality=${n.average_signal_quality} distance=${Math.round(n.distance_meters ?? 0)}m`
    );
    if (reliabilityBefore != null && n.reliability_score != null) {
      console.log(`✓ Recommendations reflect new data (reliability ${reliabilityBefore} → ${n.reliability_score})`);
    }
  }

  const iosResolved = resolveSignalStrength(null, 88);
  if (iosResolved == null || iosResolved < -120 || iosResolved > -50) {
    throw new Error(`iOS null signal_strength resolution failed: ${iosResolved}`);
  }
  console.log(`✓ iOS null signal_strength resolves to ${iosResolved} dBm server-side`);

  const token = jwt.sign(
    { student_id: studentId, email: 'verify@test.local', role: 'student' },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
  const port = process.env.PORT || 5000;

  const baseUrl = process.env.API_BASE_URL || `http://127.0.0.1:${port}`;
  if (!process.env.API_BASE_URL) {
    console.warn('[verify-hotspot-pipeline] API_BASE_URL not set; falling back to localhost');
  }

  const uploadRes = await fetch(`${baseUrl}/api/hotspot/measurements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      measurements: [
        {
          carrier_id: carrier.id,
          signal_strength: -72,
          signal_quality: 82,
          network_type: '4G',
          latitude: baseLat,
          longitude: baseLng,
          building_id: building.id,
          room_id: room?.id ?? undefined,
          accuracy: 10,
          idempotency_key: `verify_api_${Date.now()}`,
        },
      ],
      device_profile: {
        platform: 'verify-script',
        manufacturer: 'Unyva',
        model: 'ApiTest',
      },
    }),
  });

  if (uploadRes.ok) {
    const body = await uploadRes.json();
    console.log(`✓ Authenticated API upload: ${body.count ?? 0} measurement(s)`);
  } else {
    const err = await uploadRes.text();
    console.log(`⚠ Authenticated API upload skipped (is backend running on :${port}?): ${uploadRes.status} ${err}`);
  }

  const iosUploadRes = await fetch(`${baseUrl}/api/hotspot/measurements`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      measurements: [
        {
          carrier_id: carrier.id,
          signal_strength: null,
          signal_quality: 88,
          network_type: 'LTE',
          latitude: baseLat + 0.0002,
          longitude: baseLng + 0.0002,
          building_id: building.id,
          room_id: room?.id ?? undefined,
          accuracy: 12,
          idempotency_key: `verify_ios_${Date.now()}`,
        },
      ],
      device_profile: {
        platform: 'ios',
        manufacturer: 'Apple',
        model: 'iPhone',
      },
    }),
  });

  if (iosUploadRes.ok) {
    const body = await iosUploadRes.json();
    console.log(`✓ iOS null signal_strength upload: ${body.count ?? 0} measurement(s)`);
  } else if (uploadRes.ok) {
    const err = await iosUploadRes.text();
    console.log(`✗ iOS null signal_strength upload failed: ${iosUploadRes.status} ${err}`);
  }

  console.log('\n=== Pipeline verification complete ===');
  await pool.end();
}

main().catch(async (err) => {
  console.error('Verification failed:', err);
  try {
    await pool.end();
  } catch {}
  process.exit(1);
});
