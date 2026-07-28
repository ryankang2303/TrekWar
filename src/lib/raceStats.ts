export interface MilestoneThreshold {
  fraction: number;
  label: string;
}

// Order matters: kept ascending so "highest crossed" and "crossed between" scans work in one pass.
export const MILESTONE_THRESHOLDS: MilestoneThreshold[] = [
  { fraction: 0.1, label: "10% there" },
  { fraction: 0.25, label: 'A quarter of the way' },
  { fraction: 1 / 3, label: 'A third of the way' },
  { fraction: 0.5, label: 'Halfway there!' },
  { fraction: 0.75, label: '75% there' },
  { fraction: 0.9, label: '90% there — almost done!' },
  { fraction: 1, label: 'Finished!' },
];

export function percentComplete(distanceMeters: number, targetMeters: number): number {
  if (targetMeters <= 0) return 0;
  return Math.min(1, distanceMeters / targetMeters);
}

/** The furthest milestone already reached, for a persistent progress-screen callout. */
export function highestCrossedMilestone(fraction: number): MilestoneThreshold | null {
  let result: MilestoneThreshold | null = null;
  for (const threshold of MILESTONE_THRESHOLDS) {
    if (fraction >= threshold.fraction) result = threshold;
  }
  return result;
}

/** Milestones newly crossed by going from `beforeMeters` to `afterMeters`, for a one-time toast. */
export function crossedMilestonesBetween(
  beforeMeters: number,
  afterMeters: number,
  targetMeters: number
): MilestoneThreshold[] {
  if (targetMeters <= 0 || afterMeters <= beforeMeters) return [];
  const beforeFraction = beforeMeters / targetMeters;
  const afterFraction = afterMeters / targetMeters;
  return MILESTONE_THRESHOLDS.filter((t) => beforeFraction < t.fraction && afterFraction >= t.fraction);
}
