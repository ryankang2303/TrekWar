import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Activity = Database['public']['Tables']['activities']['Row'];

export function useActivities() {
  const { session } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', session.user.id)
      .order('started_at', { ascending: false });
    setActivities(data ?? []);
    setLoading(false);
  }, [session?.user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { activities, loading, refresh };
}
