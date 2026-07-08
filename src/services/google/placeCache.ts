// Simple in-memory cache for reverse geocoding results.
// Must be safe: if it fails, reverse geocoding should still return null.

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

// Keyed by rounded lat,lng
export class PlaceCache<T> {
  private store = new Map<string, CacheEntry<T>>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(opts?: { ttlMs?: number; maxEntries?: number }) {
    this.ttlMs = opts?.ttlMs ?? 1000 * 60 * 60 * 12; // 12 hours
    this.maxEntries = opts?.maxEntries ?? 5000;
  }

  get(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  set(key: string, value: T): void {
    try {
      // Basic eviction: if over max, drop an arbitrary older entry.
      if (this.store.size >= this.maxEntries) {
        const firstKey = this.store.keys().next().value;
        if (firstKey) this.store.delete(firstKey);
      }
      this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
    } catch {
      // ignore cache write errors
    }
  }
}

// Singleton cache for the process.
export const googlePlaceCache = new PlaceCache<any>();

