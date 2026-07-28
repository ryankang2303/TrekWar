import type { Database } from './database.types';

type Activity = Database['public']['Tables']['activities']['Row'];

export interface PeriodTotals {
  distanceMeters: number;
  steps: number;
  durationSeconds: number;
  count: number;
}

function emptyTotals(): PeriodTotals {
  return { distanceMeters: 0, steps: 0, durationSeconds: 0, count: 0 };
}

export function totalsForActivities(activities: Activity[]): PeriodTotals {
  return activities.reduce(
    (totals, a) => ({
      distanceMeters: totals.distanceMeters + a.distance_meters,
      steps: totals.steps + (a.steps ?? 0),
      durationSeconds: totals.durationSeconds + a.duration_seconds,
      count: totals.count + 1,
    }),
    emptyTotals()
  );
}

function isSameLocalDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function activitiesOnDay(activities: Activity[], day: Date): Activity[] {
  return activities.filter((a) => isSameLocalDay(new Date(a.started_at), day));
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function groupActivitiesByLocalDay(activities: Activity[]): Map<string, Activity[]> {
  const map = new Map<string, Activity[]>();
  for (const a of activities) {
    const key = dayKey(new Date(a.started_at));
    const list = map.get(key) ?? [];
    list.push(a);
    map.set(key, list);
  }
  return map;
}

export type ChartGranularity = 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface ChartBucket {
  label: string;
  distanceMeters: number;
}

function startOfWeek(d: Date): Date {
  const date = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  date.setDate(date.getDate() - date.getDay());
  return date;
}

function bucketRange(
  now: Date,
  granularity: ChartGranularity,
  offsetFromNow: number
): { start: Date; end: Date; label: string } {
  switch (granularity) {
    case 'daily': {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offsetFromNow);
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1);
      return { start, end, label: start.toLocaleDateString(undefined, { weekday: 'short' }) };
    }
    case 'weekly': {
      const currentWeekStart = startOfWeek(now);
      const start = new Date(
        currentWeekStart.getFullYear(),
        currentWeekStart.getMonth(),
        currentWeekStart.getDate() - offsetFromNow * 7
      );
      const end = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7);
      return { start, end, label: `${start.getMonth() + 1}/${start.getDate()}` };
    }
    case 'monthly': {
      const start = new Date(now.getFullYear(), now.getMonth() - offsetFromNow, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      return { start, end, label: start.toLocaleDateString(undefined, { month: 'short' }) };
    }
    case 'yearly': {
      const start = new Date(now.getFullYear() - offsetFromNow, 0, 1);
      const end = new Date(start.getFullYear() + 1, 0, 1);
      return { start, end, label: String(start.getFullYear()) };
    }
  }
}

/** Buckets activities into `bucketCount` trailing periods ending now, for the Stats charts. */
export function bucketActivities(
  activities: Activity[],
  granularity: ChartGranularity,
  bucketCount: number
): ChartBucket[] {
  const now = new Date();
  const buckets: ChartBucket[] = [];
  for (let offsetFromNow = bucketCount - 1; offsetFromNow >= 0; offsetFromNow--) {
    const { start, end, label } = bucketRange(now, granularity, offsetFromNow);
    const distanceMeters = activities
      .filter((a) => {
        const t = new Date(a.started_at);
        return t >= start && t < end;
      })
      .reduce((sum, a) => sum + a.distance_meters, 0);
    buckets.push({ label, distanceMeters });
  }
  return buckets;
}
