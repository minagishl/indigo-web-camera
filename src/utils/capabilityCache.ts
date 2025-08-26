// Phase 1 Capability Cache (in-memory) - placeholder for future persistence
// This keeps a short-lived cache of last applied successful constraint profile and a shallow
// snapshot of MediaTrackCapabilities to accelerate re-initialization & negotiation heuristics.
//
// Explicitly lightweight: no IndexedDB write yet (Phase 1 non-goal).
//
// Future (Phase 2+):
//  - Persist to storage (with schema version & pruning).
//  - Track per-aspect ratio performance metrics (success/failure & latency).
//  - Include HDR / advanced pipeline capability flags.

export interface CachedLastApplied {
  width: number;
  height: number;
  aspectRatio?: number;
  frameRate?: number;
}

export interface CachedCapabilities {
  lastApplied?: CachedLastApplied;
  timestamp: number;
  // Shallow snapshot of getCapabilities() (only properties we currently care about)
  capabilities?: Partial<MediaTrackCapabilities>;
}

// Internal in-memory map
const cache = new Map<string, CachedCapabilities>();

// Default max age: 10 minutes
const MAX_AGE_MS = 10 * 60 * 1000;

function isStale(
  entry: CachedCapabilities,
  now = Date.now(),
  maxAge = MAX_AGE_MS
) {
  return now - entry.timestamp > maxAge;
}

/**
 * Retrieve cached profile if fresh (<= max age).
 * Automatically drops stale entries.
 */
export function getCachedProfile(
  deviceId: string,
  maxAgeMs: number = MAX_AGE_MS
): CachedCapabilities | undefined {
  const entry = cache.get(deviceId);
  if (!entry) return undefined;
  if (isStale(entry, Date.now(), maxAgeMs)) {
    cache.delete(deviceId);
    return undefined;
  }
  return entry;
}

/**
 * Set or update cached profile. Overwrites previous entry timestamp.
 */
export function setCachedProfile(
  deviceId: string,
  data: Omit<CachedCapabilities, "timestamp"> & { timestamp?: number }
): void {
  const existing = cache.get(deviceId);
  const merged: CachedCapabilities = {
    ...existing,
    ...data,
    timestamp: data.timestamp ?? Date.now(),
  };
  cache.set(deviceId, merged);
}

/**
 * Remove all stale cache entries (housekeeping).
 */
export function clearStaleCaches(maxAgeMs: number = MAX_AGE_MS): void {
  const now = Date.now();
  for (const [k, v] of cache.entries()) {
    if (isStale(v, now, maxAgeMs)) {
      cache.delete(k);
    }
  }
}

/**
 * (Optional future) Provide a hook for persistence injection.
 * For now, we expose a minimal interface for potential external storage.
 */
export interface CapabilityCacheAdapter {
  load(deviceId: string): Promise<CachedCapabilities | undefined>;
  save(deviceId: string, data: CachedCapabilities): Promise<void>;
  purge(deviceId: string): Promise<void>;
}

// NO-OP adapter placeholder (not used in Phase 1)
export const NoopCapabilityCacheAdapter: CapabilityCacheAdapter = {
  async load() {
    return undefined;
  },
  async save() {
    /* noop */
  },
  async purge() {
    /* noop */
  },
};

// Utility to snapshot a subset of capabilities safely (defensive for browsers
// that omit some fields or throw when reading).
export function shallowSnapshotCapabilities(
  caps: MediaTrackCapabilities | null | undefined
): Partial<MediaTrackCapabilities> | undefined {
  if (!caps) return undefined;
  const clone: Partial<MediaTrackCapabilities> = {};
  // Only copy fields we may use for negotiation heuristics now
  const keys: (keyof MediaTrackCapabilities)[] = [
    "width",
    "height",
    "aspectRatio",
    "frameRate",
  ];
  for (const k of keys) {
    const value = (caps as any)[k];
    if (value !== undefined) {
      (clone as any)[k] = value;
    }
  }
  return clone;
}
