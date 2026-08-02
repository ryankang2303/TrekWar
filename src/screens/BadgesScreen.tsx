import { useCallback, useMemo } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { useAuth } from '../lib/AuthContext';
import { BadgeEntry, useBadges } from '../hooks/useBadges';
import { TIER_COLORS, TIER_LABELS } from '../lib/tiers';

export default function BadgesScreen() {
  const { profile } = useAuth();
  const { badges, loading, refresh } = useBadges(profile?.id);

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
        !loading ? (
          <Text style={styles.emptyText}>Finish a race to earn your first badge.</Text>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
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
    marginTop: 40,
  },
});
