/**
 * Aggregation Queue
 * 
 * Debounced queue for triggering aggregation after measurement uploads.
 * 
 * This module provides an interface (IAggregationQueue) that allows the
 * implementation to be replaced with a distributed queue (Redis, BullMQ)
 * for multi-instance deployments.
 * 
 * The default MemoryAggregationQueue implementation is suitable for
 * single-instance deployments only.
 * 
 * WARNING: MemoryAggregationQueue assumes a single backend instance.
 * For horizontal scaling, implement IAggregationQueue with Redis/BullMQ.
 */

import aggregationService from './aggregationService.js';
import { aggregationConfig } from '../config/aggregationConfig.js';
import { heatmapService } from './heatmapService.js';

// ==================== TYPES ====================

export interface AggregationRequest {
  buildingId: number;
  timestamp: number;
  source: 'measurement_upload' | 'speed_test' | 'manual';
}

export interface IAggregationQueue {
  /**
   * Add an aggregation request to the queue.
   * Requests are debounced within the configured window.
   */
  add(request: AggregationRequest): void;

  /**
   * Process all pending requests.
   * Called by the debounce timer.
   */
  process(): Promise<void>;

  /**
   * Gracefully shutdown the queue.
   * Should process remaining items before returning.
   */
  shutdown(): Promise<void>;

  /**
   * Get the number of pending requests.
   */
  getPendingCount(): number;
}

// ==================== MEMORY IMPLEMENTATION ====================

/**
 * Memory-backed aggregation queue with debouncing.
 * 
 * WARNING: This implementation is NOT suitable for multi-instance deployments.
 * Use a distributed queue (Redis, BullMQ, SQS) for horizontal scaling.
 * 
 * Features:
 * - Debounces rapid successive requests (configurable window)
 * - Deduplicates by buildingId
 * - Processes asynchronously without blocking callers
 * - Logs errors without throwing
 */
export class MemoryAggregationQueue implements IAggregationQueue {
  private pending = new Map<number, AggregationRequest>();
  private timer: NodeJS.Timeout | null = null;
  private isShuttingDown = false;

  constructor(
    private readonly debounceMs: number = aggregationConfig.queue.debounceMs
  ) {}

  /**
   * Add an aggregation request to the queue.
   * If a request for the same building already exists, update its timestamp.
   */
  add(request: AggregationRequest): void {
    if (this.isShuttingDown) {
      console.log('[AggregationQueue] Queue is shutting down, ignoring request');
      return;
    }

    // Deduplicate by buildingId - keep the most recent request
    const existing = this.pending.get(request.buildingId);
    if (existing) {
      // Update timestamp if this request is newer
      if (request.timestamp > existing.timestamp) {
        this.pending.set(request.buildingId, request);
      }
    } else {
      this.pending.set(request.buildingId, request);
    }

    // Schedule processing if not already scheduled
    if (!this.timer) {
      this.timer = setTimeout(() => this.process(), this.debounceMs);
    }

    console.log(
      `[AggregationQueue] Added request for building ${request.buildingId}, ` +
      `${this.pending.size} buildings pending`
    );
  }

  /**
   * Process all pending requests.
   * Each building's aggregation is independent and errors are logged.
   */
  async process(): Promise<void> {
    this.timer = null;

    if (this.pending.size === 0) {
      return;
    }

    const requests = Array.from(this.pending.values());
    this.pending.clear();

    console.log(`[AggregationQueue] Processing ${requests.length} buildings`);

    // Process all buildings in parallel
    const promises = requests.map(req => this.processBuilding(req));
    await Promise.allSettled(promises);
  }

  /**
   * Process aggregation for a single building.
   * Errors are logged but do not affect other buildings.
   */
  private async processBuilding(request: AggregationRequest): Promise<void> {
    try {
      // GPS-first: buildingId 0 is a sentinel for global aggregation.
      const result = request.buildingId === 0
        ? await aggregationService.aggregateAll()
        : await aggregationService.aggregateForBuilding(request.buildingId);

      // Fire-and-forget heatmap regeneration for affected carriers.
      // Never block the upload response path.
      for (const carrierId of result.touchedCarrierIds) {
        void (async () => {
          try {
            await heatmapService.regenerateForCarrier(carrierId);
          } catch (err) {
            console.error(
              `[AggregationQueue] Heatmap regeneration failed for building=${request.buildingId}, carrier=${carrierId}:`,
              err
            );
          }
        })();
      }
    } catch (error) {
      console.error(
        `[AggregationQueue] Error aggregating building ${request.buildingId}:`,
        error
      );
      // Do not rethrow - aggregation failures should not crash the queue
    }
  }

  /**
   * Gracefully shutdown the queue.
   * Processes any remaining items before returning.
   */
  async shutdown(): Promise<void> {
    this.isShuttingDown = true;

    // Cancel pending timer
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    // Process any remaining items
    if (this.pending.size > 0) {
      console.log(
        `[AggregationQueue] Processing ${this.pending.size} remaining buildings before shutdown`
      );
      await this.process();
    }

    this.pending.clear();
    console.log('[AggregationQueue] Shutdown complete');
  }

  /**
   * Get the number of pending requests.
   */
  getPendingCount(): number {
    return this.pending.size;
  }
}

// ==================== SINGLETON INSTANCE ====================

/**
 * Default aggregation queue instance.
 * 
 * This is a memory-backed implementation suitable for single-instance deployments.
 * For multi-instance deployments, replace this with a distributed queue implementation.
 */
export const aggregationQueue: IAggregationQueue = new MemoryAggregationQueue();

export default aggregationQueue;