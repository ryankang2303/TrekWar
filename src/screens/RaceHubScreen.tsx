import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { RaceListItem, useRaceHub } from '../hooks/useRaces';
import { metersToMiles } from '../lib/geo';
import { TIER_LABELS } from '../lib/tiers';
import { RacesStackParamList } from '../types';

export default function RaceHubScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RacesStackParamList, 'RaceHub'>>();
  const { items, loading, refresh, join } = useRaceHub();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const sections = useMemo(() => {
    const byTier = new Map<string, RaceListItem[]>();
    for (const item of items) {
      const list = byTier.get(item.template.tier) ?? [];
      list.push(item);
      byTier.set(item.template.tier, list);
    }
    return Array.from(byTier.entries());
  }, [items]);

  return (
    <FlatList
      contentContainerStyle={styles.container}
      data={sections}
      keyExtractor={([tier]) => tier}
      refreshing={loading}
      onRefresh={refresh}
      ListHeaderComponent={
        <View style={styles.privateRaceRow}>
          <Pressable
            style={styles.privateRaceButton}
            onPress={() => navigation.navigate('CreatePrivateRace')}
          >
            <Text style={styles.privateRaceButtonText}>Create private race</Text>
          </Pressable>
          <Pressable
            style={[styles.privateRaceButton, styles.privateRaceButtonSecondary]}
            onPress={() => navigation.navigate('JoinPrivateRace')}
          >
            <Text style={[styles.privateRaceButtonText, styles.privateRaceButtonTextSecondary]}>
              Join with code
            </Text>
          </Pressable>
        </View>
      }
      renderItem={({ item: [tier, races] }) => (
        <View style={styles.section}>
          <Text style={styles.tierLabel}>{TIER_LABELS[tier] ?? tier}</Text>
          {races.map(({ race, template, joined }) => (
            <Pressable
              key={race.id}
              style={styles.raceRow}
              onPress={() => navigation.navigate('RaceDetail', { raceId: race.id })}
            >
              <View style={styles.raceInfo}>
                <Text style={styles.raceName}>{race.name ?? template.name}</Text>
                <Text style={styles.raceDistance}>
                  {metersToMiles(template.target_meters).toFixed(1)} mi
                </Text>
              </View>
              {joined ? (
                <Text style={styles.joinedLabel}>Joined</Text>
              ) : (
                <Pressable style={styles.joinButton} onPress={() => join(race.id)}>
                  <Text style={styles.joinButtonText}>Join</Text>
                </Pressable>
              )}
            </Pressable>
          ))}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  privateRaceRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  privateRaceButton: {
    flex: 1,
    backgroundColor: '#2c3e50',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  privateRaceButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#2c3e50',
  },
  privateRaceButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
  privateRaceButtonTextSecondary: {
    color: '#2c3e50',
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
  raceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
  },
  raceInfo: {
    flex: 1,
  },
  raceName: {
    fontSize: 15,
    fontWeight: '600',
  },
  raceDistance: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  joinedLabel: {
    fontSize: 13,
    color: '#2c9c5f',
    fontWeight: '600',
  },
  joinButton: {
    backgroundColor: '#2c3e50',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
  },
  joinButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 13,
  },
});
