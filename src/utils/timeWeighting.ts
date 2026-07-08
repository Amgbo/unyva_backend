/**
 * Time-Weighted Averaging Utilities
 * 
 * Pure functions for calculating time-weighted averages, confidence scores,
 * consistency metrics, and reliability scores for network measurements.
 * 
 * All functions are designed to be unit-testable with no side effects.
 */

import { aggregationConfig, getDecayConstant } from '../config/aggregationConfig.js';

// ==================== TYPES ====================

export interface Measurement {
  measurement_timestamp: string;
  signal_strength: number | null;
  signal_quality: number;
  download_speed?: number | null;
  upload_speed?: number | null;
  latency?: number | null;
}

export interface WeightedAverageResult {
  value: number;
  confidence: number;       // 0-1 based on sample size and recency
  sampleCount: number;
  effectiveSampleCount: number; // Weighted sample count
}

export interface ConsistencyResult {
  standardDeviation: number;
  coefficientOfVariation: number; // 0-1 where 1 = very consistent
}

export type CoverageArea = 'building' | 'floor' | 'room';

// ==================== WEIGHTED AVERAGE ====================

/**
 * Calculate time-weighted average for a set of measurements.
 * 
 * Uses exponential decay weighting: weight = exp(-λ × age_in_days)
 * where λ = ln(2) / half_life_days
 * 
 * @param measurements Array of measurements with timestamps and values
 * @param valueExtractor Function to extract the numeric value from a measurement
 * @param halfLifeDays Half-life in days for the exponential decay
 * @returns Weighted average with confidence metrics
 */
export function calculateWeightedAverage(
  measurements: Measurement[],
  valueExtractor: (m: Measurement) => number | null,
  halfLifeDays: number
): WeightedAverageResult {
  const now = Date.now();
  const lambda = getDecayConstant(halfLifeDays);
  
  let weightedSum = 0;
  let weightTotal = 0;
  let sampleCount = 0;
  let effectiveSampleCount = 0;
  
  for (const m of measurements) {
    const value = valueExtractor(m);
    if (value === null || value === undefined || isNaN(value)) continue;
    
    const ageMs = now - new Date(m.measurement_timestamp).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const weight = Math.exp(-lambda * ageDays);
    
    weightedSum += value * weight;
    weightTotal += weight;
    sampleCount++;
    effectiveSampleCount += weight;
  }
  
  if (weightTotal === 0) {
    return {
      value: 0,
      confidence: 0,
      sampleCount: 0,
      effectiveSampleCount: 0,
    };
  }
  
  const value = weightedSum / weightTotal;
  
  // Confidence based on effective sample size
  // Max confidence when effectiveSampleCount >= 30
  const recencyFactor = Math.min(1, effectiveSampleCount / 30);
  const confidence = recencyFactor;
  
  return {
    value: Math.round(value * 100) / 100,
    confidence: Math.round(confidence * 100) / 100,
    sampleCount,
    effectiveSampleCount: Math.round(effectiveSampleCount * 100) / 100,
  };
}

/**
 * Calculate weighted average signal strength
 */
export function calculateWeightedSignalStrength(
  measurements: Measurement[]
): WeightedAverageResult {
  return calculateWeightedAverage(
    measurements,
    (m) => m.signal_strength,
    aggregationConfig.halfLife.signalStrength
  );
}

/**
 * Calculate weighted average signal quality
 */
export function calculateWeightedSignalQuality(
  measurements: Measurement[]
): WeightedAverageResult {
  return calculateWeightedAverage(
    measurements,
    (m) => m.signal_quality,
    aggregationConfig.halfLife.signalStrength // Use same half-life as signal strength
  );
}

/**
 * Calculate weighted average download speed
 */
export function calculateWeightedDownloadSpeed(
  measurements: Measurement[]
): WeightedAverageResult {
  return calculateWeightedAverage(
    measurements,
    (m) => m.download_speed ?? null,
    aggregationConfig.halfLife.downloadSpeed
  );
}

/**
 * Calculate weighted average upload speed
 */
export function calculateWeightedUploadSpeed(
  measurements: Measurement[]
): WeightedAverageResult {
  return calculateWeightedAverage(
    measurements,
    (m) => m.upload_speed ?? null,
    aggregationConfig.halfLife.uploadSpeed
  );
}

/**
 * Calculate weighted average latency
 */
export function calculateWeightedLatency(
  measurements: Measurement[]
): WeightedAverageResult {
  return calculateWeightedAverage(
    measurements,
    (m) => m.latency ?? null,
    aggregationConfig.halfLife.latency
  );
}

// ==================== CONFIDENCE CALCULATION ====================

/**
 * Calculate confidence score for aggregated data.
 * 
 * Confidence is based on:
 * 1. Sample size (more samples = higher confidence)
 * 2. Recency (newer measurements = higher confidence)
 * 
 * @param effectiveSampleCount Weighted sample count from weighted average
 * @param mostRecentAgeDays Age in days of the most recent measurement
 * @param coverageArea Type of coverage area (building/floor/room)
 * @returns Confidence score from 0 to 1
 */
export function calculateConfidence(
  effectiveSampleCount: number,
  mostRecentAgeDays: number,
  coverageArea: CoverageArea
): number {
  const thresholds = aggregationConfig.confidence;
  
  // Base confidence from sample size
  const minSamples = thresholds.minSamples[coverageArea];
  const targetSamples = thresholds.targetSamples[coverageArea];
  
  const sizeConfidence = Math.min(1,
    Math.max(0, (effectiveSampleCount - minSamples) / (targetSamples - minSamples))
  );
  
  // Recency penalty
  const recencyPenalty = Math.max(0, 1 - (mostRecentAgeDays / thresholds.maxAgeDays));
  
  // Combined confidence (70% sample size, 30% recency)
  const confidence = sizeConfidence * 0.7 + recencyPenalty * 0.3;
  
  return Math.round(Math.max(0, Math.min(1, confidence)) * 100) / 100;
}

// ==================== CONSISTENCY CALCULATION ====================

/**
 * Calculate signal consistency (inverse of coefficient of variation).
 * 
 * Consistency measures how stable the signal is across measurements.
 * A consistency of 1 means all measurements are identical.
 * A consistency of 0 means very high variance.
 * 
 * @param measurements Array of measurements
 * @returns Consistency score from 0 to 1
 */
export function calculateConsistency(
  measurements: Measurement[]
): ConsistencyResult {
  const validMeasurements = measurements.filter(m => m.signal_strength !== null);
  
  if (validMeasurements.length < 2) {
    return {
      standardDeviation: 0,
      coefficientOfVariation: validMeasurements.length === 1 ? 1 : 0,
    };
  }
  
  const values = validMeasurements.map(m => m.signal_strength as number);
  const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  const standardDeviation = Math.sqrt(variance);
  
  // Coefficient of variation (normalized by mean magnitude)
  // Lower CV = more consistent
  const meanMagnitude = Math.abs(mean);
  const cv = meanMagnitude > 0 ? standardDeviation / meanMagnitude : 0;
  
  // Convert to 0-1 consistency score (inverse of CV)
  // CV of 0 = perfect consistency (1.0)
  // CV of 0.5+ = low consistency (approaching 0)
  const consistency = Math.max(0, 1 - (cv / 0.5));
  
  return {
    standardDeviation: Math.round(standardDeviation * 100) / 100,
    coefficientOfVariation: Math.round(consistency * 100) / 100,
  };
}

// ==================== RELIABILITY CALCULATION ====================

/**
 * Calculate reliability score based on measurement quality and confidence.
 * 
 * Reliability = weighted combination of:
 * - Signal quality (30%): How strong the signal is (0-100 normalized to 0-1)
 * - Confidence (40%): How reliable the data is (sample size, recency)
 * - Signal consistency (30%): Standard deviation of measurements
 * 
 * Does NOT include network type bonuses - reliability should reflect
 * actual measured quality, not theoretical capabilities.
 * 
 * @param averageSignalQuality Average signal quality (0-100)
 * @param confidence Confidence score (0-1)
 * @param signalConsistency Consistency score (0-1)
 * @returns Reliability score (0-100)
 */
export function calculateReliability(
  averageSignalQuality: number,
  confidence: number,
  signalConsistency: number
): number {
  const reliability = (
    (averageSignalQuality / 100) * 0.3 +
    confidence * 0.4 +
    signalConsistency * 0.3
  );
  
  return Math.round(Math.max(0, Math.min(1, reliability)) * 100);
}

// ==================== MOST RECENT AGE ====================

/**
 * Calculate the age in days of the most recent measurement.
 * 
 * @param measurements Array of measurements
 * @returns Age in days of the most recent measurement
 */
export function getMostRecentAgeDays(measurements: Measurement[]): number {
  if (measurements.length === 0) return Infinity;
  
  const mostRecent = measurements.reduce((latest, m) => {
    const mDate = new Date(m.measurement_timestamp).getTime();
    return mDate > latest ? mDate : latest;
  }, 0);
  
  const now = Date.now();
  return (now - mostRecent) / (1000 * 60 * 60 * 24);
}