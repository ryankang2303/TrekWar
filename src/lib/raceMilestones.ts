import { supabase } from './supabase';

export interface JoinedRaceSnapshot {
  raceId: string;
  name: string;
  targetMeters: number;
  priorMeters: number;
}

/**
 * Snapshot of the user's currently-joined races and their progress *before*
 * a new activity is saved. Call this first, then diff against
 * `priorMeters + newActivityDistance` after the save — the activities→
 * race_progress fan-out trigger credits the activity's full distance to
 * every race that was active at insert time, so no re-query is needed.
 */
export async function snapshotJoinedRaces(userId: string): Promise<JoinedRaceSnapshot[]> {
  const { data: participants } = await supabase
    .from('race_participants')
    .select('race_id')
    .eq('user_id', userId)
    .eq('status', 'active');

  const raceIds = (participants ?? []).map((p) => p.race_id);
  if (raceIds.length === 0) return [];

  const [{ data: races }, { data: templates }, { data: progress }] = await Promise.all([
    supabase.from('races').select('*').in('id', raceIds),
    supabase.from('race_templates').select('*'),
    supabase.from('race_progress').select('race_id, contributed_meters').eq('user_id', userId).in('race_id', raceIds),
  ]);

  const templatesById = new Map((templates ?? []).map((t) => [t.id, t]));
  const priorByRace = new Map<string, number>();
  for (const p of progress ?? []) {
    priorByRace.set(p.race_id, (priorByRace.get(p.race_id) ?? 0) + p.contributed_meters);
  }

  return (races ?? [])
    .map((race) => {
      const template = templatesById.get(race.template_id);
      if (!template) return null;
      return {
        raceId: race.id,
        name: race.name ?? template.name,
        targetMeters: template.target_meters,
        priorMeters: priorByRace.get(race.id) ?? 0,
      };
    })
    .filter((s): s is JoinedRaceSnapshot => s !== null);
}
