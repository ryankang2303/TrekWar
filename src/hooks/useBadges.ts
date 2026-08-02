import { useCallback, useEffect, useState } from 'react';

import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Badge = Database['public']['Tables']['badges']['Row'];

export interface BadgeEntry {
  badge: Badge;
  raceName: string;
}

export function useBadges(userId: string | undefined) {
  const [badges, setBadges] = useState<BadgeEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) {
      setBadges([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    const { data: badgeRows } = await supabase
      .from('badges')
      .select('*')
      .eq('user_id', userId)
      .order('awarded_at', { ascending: false });

    const raceIds = (badgeRows ?? []).map((b) => b.race_id);
    const { data: races } = raceIds.length
      ? await supabase.from('races').select('*').in('id', raceIds)
      : { data: [] };
    const templateIds = (races ?? []).map((r) => r.template_id);
    const { data: templates } = templateIds.length
      ? await supabase.from('race_templates').select('*').in('id', templateIds)
      : { data: [] };

    const templatesById = new Map((templates ?? []).map((t) => [t.id, t]));
    const racesById = new Map((races ?? []).map((r) => [r.id, r]));

    const entries: BadgeEntry[] = (badgeRows ?? []).map((badge) => {
      const race = racesById.get(badge.race_id);
      const template = race ? templatesById.get(race.template_id) : undefined;
      return { badge, raceName: race?.name ?? template?.name ?? 'Unknown race' };
    });

    setBadges(entries);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { badges, loading, refresh };
}
