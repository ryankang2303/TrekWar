import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { BadgeEntry, useBadges } from '../hooks/useBadges';
import { metersToMiles } from '../lib/geo';
import { TIER_COLORS, TIER_LABELS } from '../lib/tiers';
import { ProfileStackParamList } from '../types';

export default function FriendProfileScreen() {
  const route = useRoute<RouteProp<ProfileStackParamList, 'FriendProfile'>>();
  const { userId, displayName, lifetimeMeters } = route.params;
  const { badges, loading, refresh } = useBadges(userId);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const sections = useMemo(() => {
    const byTier = new Map<string, BadgeEntry[]>();
    for (const entry of badges) {
      const list = byTier.get(entry.badge.tier) ?? [];
      list.push(entry);
      byTier.set(entry.badge.tier, list);
    }
    return Array.from(byTier.entries());
  }, [badges]);

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={sections}
      keyExtractor={([tier]) => tier}
      refreshing={loading}
      onRefresh={refresh}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.lifetime}>{metersToMiles(lifetimeMeters).toFixed(1)} mi lifetime</Text>
          <Text style={styles.trophyLabel}>Trophy case</Text>
        </View>
      }
      renderItem={({ item: [tier, entries] }) => (
        <View style={styles.section}>
          <Text style={styles.tierLabel}>{TIER_LABELS[tier] ?? tier}</Text>
          {entries.map(({ badge, raceName }) => (
            <View key={badge.id} style={styles.badgeRow}>
              <View style={[styles.badgeDot, { backgroundColor: TIER_COLORS[tier] ?? '#888' }]} />
              <Text style={styles.badgeName}>{raceName}</Text>
            </View>
          ))}
        </View>
      )}
      ListEmptyComponent={
        !loading ? <Text style={styles.emptyText}>No badges yet.</Text> : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  lifetime: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 20,
  },
  trophyLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    alignSelf: 'flex-start',
  },
  section: {
    marginBottom: 24,
  },
  tierLabel: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#2c3e50',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    gap: 10,
  },
  badgeDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  badgeName: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
});
