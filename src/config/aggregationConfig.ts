/**
 * Aggregation Configuration
 * 
 * Centralized configuration for the network intelligence aggregation pipeline.
 * All weighting parameters, thresholds, and timing values are defined here.
 * 
 * These values can be overridden via environment variables if needed.
 */

export interface HalfLifeConfig {
  signalStrength: number;  // days
  downloadSpeed: number;   // days
  uploadSpeed: number;     // days
  latency: number;         // days
}

export interface SampleThresholds {
  building: number;
  floor: number;
  room: number;
}

export interface ConfidenceConfig {
  minSamples: SampleThresholds;
  targetSamples: SampleThresholds;
  maxAgeDays: number;
}

export interface SpatialConfig {
  nearbyRadiusMeters: number;
  maxMeasurements: number;
}

export interface HeatmapConfig {
  zoomLevel: number;
  tileSize: number;
}

export interface QueueConfig {
  debounceMs: number;
  maxBatchSize: number;
}

export interface AggregationConfig {
  halfLife: HalfLifeConfig;
  queue: QueueConfig;
  confidence: ConfidenceConfig;
  spatial: SpatialConfig;
  heatmap: HeatmapConfig;
}

/**
 * Default aggregation configuration
 */
export const aggregationConfig: AggregationConfig = {
  // Time-weighted averaging half-lives (in days)
  // Determines how quickly older measurements lose influence
  halfLife: {
    signalStrength: 7,    // Signal strength: 7 days (relatively stable)
    downloadSpeed: 3,     // Download speed: 3 days (more volatile)
    uploadSpeed: 3,       // Upload speed: 3 days (more volatile)
    latency: 1,           // Latency: 1 day (most volatile)
  },

  // Queue configuration for debounced aggregation
  queue: {
    debounceMs: 30 * 60 * 1000, // 30 minute debounce window
    maxBatchSize: 100,    // Max items per batch
  },

  // Confidence calculation thresholds
  confidence: {
    minSamples: {
      building: 10,       // Minimum samples for building-level confidence
      floor: 5,           // Minimum samples for floor-level confidence
      room: 3,            // Minimum samples for room-level confidence
    },
    targetSamples: {
      building: 100,      // Target samples for full building confidence
      floor: 50,          // Target samples for full floor confidence
      room: 20,           // Target samples for full room confidence
    },
    maxAgeDays: 30,       // Measurements older than this get low confidence
  },

  // Spatial query parameters
  spatial: {
    nearbyRadiusMeters: 100,  // Radius for "nearby" measurements
    maxMeasurements: 1000,    // Max measurements to fetch per query
  },

  // Heatmap generation configuration
  heatmap: {
    zoomLevel: 18,        // Zoom level for tiles
    tileSize: 256,        // Standard tile size (pixels)
  },
};

/**
 * Get decay constant (lambda) for exponential decay weighting
 * λ = ln(2) / half_life
 */
export function getDecayConstant(halfLifeDays: number): number {
  return Math.LN2 / halfLifeDays;
}

/**
 * Get decay constant for a specific measurement type
 */
export function getDecayConstantForType(
  type: keyof HalfLifeConfig
): number {
  return getDecayConstant(aggregationConfig.halfLife[type]);
}