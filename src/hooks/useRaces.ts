import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type RaceTemplate = Database['public']['Tables']['race_templates']['Row'];
type Race = Database['public']['Tables']['races']['Row'];

export interface RaceListItem {
  race: Race;
  template: RaceTemplate;
  joined: boolean;
}

export function useRaceHub() {
  const { session } = useAuth();
  const [items, setItems] = useState<RaceListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const [{ data: races }, { data: templates }, { data: participants }] = await Promise.all([
      supabase.from('races').select('*').eq('is_private', false),
      supabase.from('race_templates').select('*'),
      supabase.from('race_participants').select('race_id').eq('user_id', session.user.id),
    ]);

    const templatesById = new Map((templates ?? []).map((t) => [t.id, t]));
    const joinedRaceIds = new Set((participants ?? []).map((p) => p.race_id));

    const list: RaceListItem[] = (races ?? [])
      .map((race) => {
        const template = templatesById.get(race.template_id);
        return template ? { race, template, joined: joinedRaceIds.has(race.id) } : null;
      })
      .filter((item): item is RaceListItem => item !== null)
      .sort((a, b) => a.template.target_meters - b.template.target_meters);

    setItems(list);
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

  return { items, loading, refresh, join };
}

export interface RaceDetailData {
  race: Race;
  template: RaceTemplate;
  joined: boolean;
  myDistanceMeters: number;
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

    const [{ data: race }, { data: participant }, { data: progressRows }] = await Promise.all([
      supabase.from('races').select('*').eq('id', raceId).maybeSingle(),
      supabase
        .from('race_participants')
        .select('id')
        .eq('race_id', raceId)
        .eq('user_id', session.user.id)
        .maybeSingle(),
      supabase.from('race_progress').select('contributed_meters').eq('race_id', raceId).eq('user_id', session.user.id),
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

    const myDistanceMeters = (progressRows ?? []).reduce((sum, p) => sum + p.contributed_meters, 0);

    setDetail({ race, template, joined: !!participant, myDistanceMeters });
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

  return { detail, loading, refresh, join };
}
