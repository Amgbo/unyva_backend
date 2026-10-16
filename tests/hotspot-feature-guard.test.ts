/**
 * Hotspot Feature Guard & Switch - Test Suite
 * 
 * Validates that:
 * 1. isHotspotEnabled() strictly defaults to false in production (NODE_ENV=production).
 * 2. isHotspotEnabled() respects HOTSPOT_ENABLED='true' vs 'false'.
 * 3. hotspotFeatureGuard blocks requests with HTTP 503 and standard payload when disabled.
 * 4. hotspotFeatureGuard passes requests to next() when enabled.
 */

import { isHotspotEnabled } from '../src/config/features.js';
import { hotspotFeatureGuard } from '../src/middleware/hotspotFeatureGuard.js';
import type { Request, Response, NextFunction } from 'express';

export async function runHotspotGuardTests(): Promise<boolean> {
  console.log('🧪 Running Hotspot Feature Guard & Switch Tests...\n');
  let passed = 0;
  let failed = 0;

  const originalEnv = process.env.NODE_ENV;
  const originalHotspot = process.env.HOTSPOT_ENABLED;

  function assert(name: string, condition: boolean, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${name} - ${detail || 'assertion failed'}`);
      failed++;
    }
  }

  try {
    // Test 1: Production defaults to disabled when HOTSPOT_ENABLED is unset
    process.env.NODE_ENV = 'production';
    delete process.env.HOTSPOT_ENABLED;
    assert(
      'Production defaults to disabled (false)',
      isHotspotEnabled() === false,
      `Expected false, got ${isHotspotEnabled()}`
    );

    // Test 2: Production enables Hotspot when explicitly set to 'true'
    process.env.HOTSPOT_ENABLED = 'true';
    assert(
      'Production enables Hotspot with HOTSPOT_ENABLED=true',
      isHotspotEnabled() === true,
      `Expected true, got ${isHotspotEnabled()}`
    );

    // Test 3: Production disables Hotspot when set to 'false'
    process.env.HOTSPOT_ENABLED = 'false';
    assert(
      'Production disables Hotspot with HOTSPOT_ENABLED=false',
      isHotspotEnabled() === false,
      `Expected false, got ${isHotspotEnabled()}`
    );

    // Test 4: Development defaults to disabled unless explicitly enabled
    process.env.NODE_ENV = 'development';
    delete process.env.HOTSPOT_ENABLED;
    assert(
      'Default without flag is disabled (false)',
      isHotspotEnabled() === false,
      `Expected false, got ${isHotspotEnabled()}`
    );

    // Test 5: Middleware returns 503 when disabled
    process.env.HOTSPOT_ENABLED = 'false';
    let statusCode: number | null = null;
    let jsonResponse: any = null;
    let nextCalled: boolean = false;

    const mockReq = {
      method: 'GET',
      originalUrl: '/api/hotspot/nearby',
    } as Request;

    const mockRes = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(data: any) {
        jsonResponse = data;
        return this;
      },
    } as unknown as Response;

    const mockNext = (() => {
      nextCalled = true;
    }) as NextFunction;

    hotspotFeatureGuard(mockReq, mockRes, mockNext);

    assert(
      'Middleware returns HTTP 503 when disabled',
      statusCode === 503,
      `Expected status 503, got ${statusCode}`
    );
    assert(
      'Middleware returns code FEATURE_DISABLED',
      jsonResponse?.code === 'FEATURE_DISABLED',
      `Expected code FEATURE_DISABLED, got ${jsonResponse?.code}`
    );
    assert(
      'Middleware does NOT call next() when disabled',
      Boolean(nextCalled) === false,
      'next() was called unexpectedly'
    );

    // Test 6: Middleware calls next() when enabled
    process.env.HOTSPOT_ENABLED = 'true';
    statusCode = null;
    jsonResponse = null;
    nextCalled = false;

    hotspotFeatureGuard(mockReq, mockRes, mockNext);

    assert(
      'Middleware calls next() when enabled',
      Boolean(nextCalled) === true,
      'next() was not called'
    );
    assert(
      'Middleware does not send response when enabled',
      statusCode === null,
      `Unexpected status code ${statusCode}`
    );

  } finally {
    // Restore original env
    process.env.NODE_ENV = originalEnv;
    if (originalHotspot !== undefined) {
      process.env.HOTSPOT_ENABLED = originalHotspot;
    } else {
      delete process.env.HOTSPOT_ENABLED;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  return failed === 0;
}

// Run immediately if invoked directly
runHotspotGuardTests().then((ok) => {
  if (!ok) process.exit(1);
});
