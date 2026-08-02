import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { generateInviteCode } from '../lib/inviteCode';
import type { Database } from '../lib/database.types';

type RaceTemplate = Database['public']['Tables']['race_templates']['Row'];
type Race = Database['public']['Tables']['races']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];
type Kudos = Database['public']['Tables']['kudos']['Row'];

export interface RaceListItem {
  race: Race;
  template: RaceTemplate;
  joined: boolean;
}

// 'now' means no synced-start gating (start_at stays null, same as a public
// race's always-open lobby) — the other presets give invited friends time to
// accept before the fairness gate in fan_out_activity_to_races (migration
// 0006) starts crediting anyone's activities.
export const START_PRESETS = ['now', '1hour', 'tomorrow', '3days'] as const;
export type StartPreset = (typeof START_PRESETS)[number];

export const START_PRESET_LABELS: Record<StartPreset, string> = {
  now: 'Start now',
  '1hour': 'Start in 1 hour',
  tomorrow: 'Start tomorrow',
  '3days': 'Start in 3 days',
};

function computeStartAt(preset: StartPreset): string | null {
  if (preset === 'now') return null;
  const offsetMs = preset === '1hour' ? 3_600_000 : preset === 'tomorrow' ? 86_400_000 : 3 * 86_400_000;
  return new Date(Date.now() + offsetMs).toISOString();
}

export function useRaceHub() {
  const { session } = useAuth();
  const [items, setItems] = useState<RaceListItem[]>([]);
  const [templates, setTemplates] = useState<RaceTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setItems([]);
      setTemplates([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: races }, { data: fetchedTemplates }, { data: participants }] = await Promise.all([
      supabase.from('races').select('*').eq('is_private', false),
      supabase.from('race_templates').select('*'),
      supabase.from('race_participants').select('race_id').eq('user_id', session.user.id),
    ]);

    const templatesById = new Map((fetchedTemplates ?? []).map((t) => [t.id, t]));
    const joinedRaceIds = new Set((participants ?? []).map((p) => p.race_id));

    const list: RaceListItem[] = (races ?? [])
      .map((race) => {
        const template = templatesById.get(race.template_id);
        return template ? { race, template, joined: joinedRaceIds.has(race.id) } : null;
      })
      .filter((item): item is RaceListItem => item !== null)
      .sort((a, b) => a.template.target_meters - b.template.target_meters);

    setItems(list);
    setTemplates(
      (fetchedTemplates ?? []).slice().sort((a, b) => a.target_meters - b.target_meters)
    );
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const join = useCallback(
    async (raceId: string) => {
      if (!session?.user) return;
      await supabase.from('race_participants').insert({ race_id: raceId, user_id: session.user.id });
      await refresh();
    },
    [session?.user, refresh]
  );

  const createPrivateRace = useCallback(
    async (
      templateId: string,
      name: string,
      preset: StartPreset
    ): Promise<{ raceId: string; inviteCode: string } | { error: string }> => {
      if (!session?.user) return { error: 'Not signed in' };
      const startAt = computeStartAt(preset);

      for (let attempt = 0; attempt < 5; attempt++) {
        const inviteCode = generateInviteCode();
        const { data: race, error } = await supabase
          .from('races')
          .insert({
            template_id: templateId,
            is_private: true,
            created_by: session.user.id,
            name: name.trim() || null,
            invite_code: inviteCode,
            start_at: startAt,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') continue; // invite_code collision — regenerate and retry
          return { error: error.message };
        }

        await supabase.from('race_participants').insert({ race_id: race.id, user_id: session.user.id });
        await refresh();
        return { raceId: race.id, inviteCode };
      }
      return { error: 'Could not generate a unique invite code — try again' };
    },
    [session?.user, refresh]
  );

  const joinPrivateRace = useCallback(
    async (code: string): Promise<{ raceId: string } | { error: string }> => {
      if (!session?.user) return { error: 'Not signed in' };
      const { data, error } = await supabase.rpc('join_race_by_invite_code', {
        p_code: code.trim().toUpperCase(),
      });
      if (error) return { error: error.message };
      if (!data) return { error: 'Invalid code' };
      await refresh();
      return { raceId: data.id };
    },
    [session?.user, refresh]
  );

  return { items, templates, loading, refresh, join, createPrivateRace, joinPrivateRace };
}

export interface RivalEntry {
  profile: Profile;
  totalMeters: number;
  latestProgressId: string | null;
  kudosCount: number;
  kudosGivenByMe: boolean;
  isMe: boolean;
}

export interface RaceDetailData {
  race: Race;
  template: RaceTemplate;
  joined: boolean;
  myDistanceMeters: number;
  rivals: RivalEntry[];
}

export function useRaceDetail(raceId: string) {
  const { session } = useAuth();
  const [detail, setDetail] = useState<RaceDetailData | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setDetail(null);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: race }, { data: participant }] = await Promise.all([
      supabase.from('races').select('*').eq('id', raceId).maybeSingle(),
      supabase
        .from('race_participants')
        .select('id')
        .eq('race_id', raceId)
        .eq('user_id', session.user.id)
        .maybeSingle(),
    ]);

    if (!race) {
      setDetail(null);
      setLoading(false);
      return;
    }

    const { data: template } = await supabase
      .from('race_templates')
      .select('*')
      .eq('id', race.template_id)
      .maybeSingle();

    if (!template) {
      setDetail(null);
      setLoading(false);
      return;
    }

    const joined = !!participant;
    let myDistanceMeters = 0;
    let rivals: RivalEntry[] = [];

    if (joined) {
      const [{ data: participants }, { data: progressRows }] = await Promise.all([
        supabase.from('race_participants').select('user_id').eq('race_id', raceId),
        supabase
          .from('race_progress')
          .select('id, user_id, contributed_meters, recorded_at')
          .eq('race_id', raceId)
          .order('recorded_at', { ascending: true }),
      ]);

      const participantIds = (participants ?? []).map((p) => p.user_id);
      const { data: profiles } = participantIds.length
        ? await supabase.from('profiles').select('*').in('id', participantIds)
        : { data: [] as Profile[] };
      const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));

      const totalsByUser = new Map<string, number>();
      const latestRowByUser = new Map<string, { id: string; recorded_at: string }>();
      for (const row of progressRows ?? []) {
        totalsByUser.set(row.user_id, (totalsByUser.get(row.user_id) ?? 0) + row.contributed_meters);
        const existingLatest = latestRowByUser.get(row.user_id);
        if (!existingLatest || row.recorded_at >= existingLatest.recorded_at) {
          latestRowByUser.set(row.user_id, { id: row.id, recorded_at: row.recorded_at });
        }
      }

      const latestProgressIds = Array.from(latestRowByUser.values()).map((r) => r.id);
      const { data: kudosRows } = latestProgressIds.length
        ? await supabase.from('kudos').select('*').in('race_progress_id', latestProgressIds)
        : { data: [] as Kudos[] };

      const kudosCountByProgressId = new Map<string, number>();
      const kudosMineByProgressId = new Set<string>();
      for (const k of kudosRows ?? []) {
        if (!k.race_progress_id) continue;
        kudosCountByProgressId.set(k.race_progress_id, (kudosCountByProgressId.get(k.race_progress_id) ?? 0) + 1);
        if (k.from_user_id === session.user.id) kudosMineByProgressId.add(k.race_progress_id);
      }

      rivals = participantIds
        .map((userId) => {
          const p = profilesById.get(userId);
          if (!p) return null;
          const latest = latestRowByUser.get(userId);
          const entry: RivalEntry = {
            profile: p,
            totalMeters: totalsByUser.get(userId) ?? 0,
            latestProgressId: latest?.id ?? null,
            kudosCount: latest ? kudosCountByProgressId.get(latest.id) ?? 0 : 0,
            kudosGivenByMe: latest ? kudosMineByProgressId.has(latest.id) : false,
            isMe: userId === session.user.id,
          };
          return entry;
        })
        .filter((r): r is RivalEntry => r !== null)
        .sort((a, b) => b.totalMeters - a.totalMeters);

      myDistanceMeters = totalsByUser.get(session.user.id) ?? 0;
    }

    setDetail({ race, template, joined, myDistanceMeters, rivals });
    setLoading(false);
  }, [session?.user, raceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const join = useCallback(async () => {
    if (!session?.user) return;
    await supabase.from('race_participants').insert({ race_id: raceId, user_id: session.user.id });
    await refresh();
  }, [session?.user, raceId, refresh]);

  const giveKudos = useCallback(
    async (raceProgressId: string) => {
      if (!session?.user) return;
      await supabase.from('kudos').insert({ from_user_id: session.user.id, race_progress_id: raceProgressId });
      await refresh();
    },
    [session?.user, refresh]
  );

  return { detail, loading, refresh, join, giveKudos };
}
