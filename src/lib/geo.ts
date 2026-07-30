const EARTH_RADIUS_METERS = 6371000;

export interface GeoPoint {
  latitude: number;
  longitude: number;
  timestampMs: number;
  accuracyMeters: number | null;
}

export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h)));
}

const MAX_ACCEPTABLE_ACCURACY_METERS = 50;
const MAX_ACCEPTABLE_SPEED_MPS = 6.7056; // 15 mph — well above real walk/run pace, catches GPS spikes

export interface FixEvaluation {
  accepted: boolean;
  /** Distance in meters from the previous accepted fix; 0 if rejected or if this is the first fix. */
  distanceMeters: number;
}

/**
 * Decides whether a new GPS fix should be accepted into the accumulated
 * route, given the last accepted fix. Rejects poor-accuracy fixes and
 * fixes that imply an impossible speed (the classic "GPS spike adds a
 * fake half-mile" bug), computing the incremental distance at the same time
 * so callers never re-derive it from a different (possibly inconsistent) check.
 */
export function evaluateFix(previous: GeoPoint | null, next: GeoPoint): FixEvaluation {
  if (next.accuracyMeters !== null && next.accuracyMeters > MAX_ACCEPTABLE_ACCURACY_METERS) {
    return { accepted: false, distanceMeters: 0 };
  }
  if (!previous) return { accepted: true, distanceMeters: 0 };

  const dtSeconds = (next.timestampMs - previous.timestampMs) / 1000;
  if (dtSeconds <= 0) return { accepted: false, distanceMeters: 0 };

  const distanceMeters = haversineMeters(previous, next);
  const impliedSpeed = distanceMeters / dtSeconds;
  if (impliedSpeed > MAX_ACCEPTABLE_SPEED_MPS) return { accepted: false, distanceMeters: 0 };

  return { accepted: true, distanceMeters };
}

const METERS_PER_MILE = 1609.344;
const RUN_PACE_THRESHOLD_MIN_PER_MILE = 10;

export function metersToMiles(meters: number): number {
  return meters / METERS_PER_MILE;
}

// Average adult walking stride, used to estimate distance from passively
// tracked steps (no GPS involved) — the same approach Health-app-style
// pedometer distance estimates use. A flat average, not calibrated per user.
export const STRIDE_LENGTH_METERS = 0.762;

export function stepsToMeters(steps: number): number {
  return steps * STRIDE_LENGTH_METERS;
}

/** Pace-threshold walk/run classification, per MVP.md 7.1 (tunable cutoff). */
export function classifyActivityType(distanceMeters: number, durationSeconds: number): 'walk' | 'run' {
  const miles = metersToMiles(distanceMeters);
  if (miles <= 0 || durationSeconds <= 0) return 'walk';
  const paceMinPerMile = durationSeconds / 60 / miles;
  return paceMinPerMile <= RUN_PACE_THRESHOLD_MIN_PER_MILE ? 'run' : 'walk';
}

// Below this, a few meters of GPS jitter against several seconds of elapsed
// time produces a mathematically "correct" but meaningless pace (e.g.
// hundreds of thousands of minutes/mile) — show a placeholder instead.
const MIN_METERS_FOR_PACE = 15;

export function formatPace(distanceMeters: number, durationSeconds: number): string {
  if (distanceMeters < MIN_METERS_FOR_PACE) return '--:--';
  const miles = metersToMiles(distanceMeters);
  const paceMinPerMile = durationSeconds / 60 / miles;
  if (!Number.isFinite(paceMinPerMile)) return '--:--';
  const minutes = Math.floor(paceMinPerMile);
  const seconds = Math.round((paceMinPerMile - minutes) * 60);
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function formatElapsed(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
