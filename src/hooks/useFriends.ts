import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type Friendship = Database['public']['Tables']['friendships']['Row'];

export interface FriendRequest {
  friendship: Friendship;
  profile: Profile;
}

export interface FriendLeaderboardEntry {
  profile: Profile;
  lifetimeMeters: number;
  isMe: boolean;
}

export function useFriends() {
  const { session, profile: myProfile } = useAuth();
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [leaderboard, setLeaderboard] = useState<FriendLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session?.user || !myProfile) {
      setIncoming([]);
      setOutgoing([]);
      setLeaderboard([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const myId = session.user.id;

    const [{ data: friendships }, { data: distances }] = await Promise.all([
      supabase.from('friendships').select('*').or(`requester_id.eq.${myId},addressee_id.eq.${myId}`),
      supabase.rpc('get_friends_lifetime_distance'),
    ]);

    const rows = friendships ?? [];
    const otherIds = new Set<string>();
    for (const f of rows) {
      otherIds.add(f.requester_id === myId ? f.addressee_id : f.requester_id);
    }

    const { data: profiles } = otherIds.size
      ? await supabase.from('profiles').select('*').in('id', Array.from(otherIds))
      : { data: [] as Profile[] };
    const profilesById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const incomingList: FriendRequest[] = [];
    const outgoingList: FriendRequest[] = [];
    const acceptedIds: string[] = [];

    for (const f of rows) {
      const otherId = f.requester_id === myId ? f.addressee_id : f.requester_id;
      const otherProfile = profilesById.get(otherId);
      if (!otherProfile) continue;

      if (f.status === 'pending') {
        if (f.addressee_id === myId) incomingList.push({ friendship: f, profile: otherProfile });
        else outgoingList.push({ friendship: f, profile: otherProfile });
      } else if (f.status === 'accepted') {
        acceptedIds.push(otherId);
      }
    }

    const distanceByUser = new Map((distances ?? []).map((d) => [d.user_id, d.lifetime_meters]));
    const board: FriendLeaderboardEntry[] = [myId, ...acceptedIds]
      .map((id) => {
        const p = id === myId ? myProfile : profilesById.get(id);
        if (!p) return null;
        return { profile: p, lifetimeMeters: distanceByUser.get(id) ?? 0, isMe: id === myId };
      })
      .filter((e): e is FriendLeaderboardEntry => e !== null)
      .sort((a, b) => b.lifetimeMeters - a.lifetimeMeters);

    setIncoming(incomingList);
    setOutgoing(outgoingList);
    setLeaderboard(board);
    setLoading(false);
  }, [session?.user, myProfile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendRequest = useCallback(
    async (username: string): Promise<string | null> => {
      if (!session?.user) return 'Not signed in';
      const normalized = username.trim().toLowerCase();
      if (!normalized) return 'Enter a username';

      const { data: target } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', normalized)
        .maybeSingle();
      if (!target) return 'No user with that username';
      if (target.id === session.user.id) return "That's you";

      const { data: existing } = await supabase
        .from('friendships')
        .select('*')
        .or(
          `and(requester_id.eq.${session.user.id},addressee_id.eq.${target.id}),and(requester_id.eq.${target.id},addressee_id.eq.${session.user.id})`
        )
        .maybeSingle();

      if (existing) {
        if (existing.status === 'accepted') return 'Already friends';
        if (existing.requester_id === target.id && existing.status === 'pending') {
          // They already sent us a request — accept it instead of duplicating.
          const { error } = await supabase
            .from('friendships')
            .update({ status: 'accepted', responded_at: new Date().toISOString() })
            .eq('id', existing.id);
          if (error) return error.message;
          await refresh();
          return null;
        }
        return 'Request already pending';
      }

      const { error } = await supabase
        .from('friendships')
        .insert({ requester_id: session.user.id, addressee_id: target.id });
      if (error) return error.message;
      await refresh();
      return null;
    },
    [session?.user, refresh]
  );

  const respond = useCallback(
    async (friendshipId: string, accept: boolean) => {
      if (accept) {
        await supabase
          .from('friendships')
          .update({ status: 'accepted', responded_at: new Date().toISOString() })
          .eq('id', friendshipId);
      } else {
        await supabase.from('friendships').delete().eq('id', friendshipId);
      }
      await refresh();
    },
    [refresh]
  );

  const cancel = useCallback(
    async (friendshipId: string) => {
      await supabase.from('friendships').delete().eq('id', friendshipId);
      await refresh();
    },
    [refresh]
  );

  return { incoming, outgoing, leaderboard, loading, refresh, sendRequest, respond, cancel };
}
