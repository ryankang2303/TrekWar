import { useCallback } from 'react';
import { Button, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { useRaceDetail } from '../hooks/useRaces';
import { metersToMiles } from '../lib/geo';
import { highestCrossedMilestone, percentComplete } from '../lib/raceStats';
import RaceProgressPath from '../components/RaceProgressPath';
import { RacesStackParamList } from '../types';

export default function RaceDetailScreen() {
  const route = useRoute<RouteProp<RacesStackParamList, 'RaceDetail'>>();
  const { detail, loading, refresh, join } = useRaceDetail(route.params.raceId);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  if (!detail) {
    return (
      <View style={styles.centered}>
        <Text>{loading ? 'Loading…' : 'Race not found.'}</Text>
      </View>
    );
  }

  const { race, template, joined, myDistanceMeters } = detail;
  const fraction = percentComplete(myDistanceMeters, template.target_meters);
  const milestone = highestCrossedMilestone(fraction);
  const remainingMiles = Math.max(0, metersToMiles(template.target_meters - myDistanceMeters));

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{race.name ?? template.name}</Text>
      {template.description && <Text style={styles.description}>{template.description}</Text>}

      <RaceProgressPath fraction={fraction} />

      <View style={styles.statsRow}>
        <Text style={styles.statValue}>{metersToMiles(myDistanceMeters).toFixed(2)} mi</Text>
        <Text style={styles.statSeparator}>/</Text>
        <Text style={styles.statTarget}>{metersToMiles(template.target_meters).toFixed(1)} mi</Text>
      </View>

      {joined ? (
        <>
          {milestone && <Text style={styles.milestoneBanner}>{milestone.label}</Text>}
          <Text style={styles.remaining}>
            {fraction >= 1
              ? "You've finished this race!"
              : `${remainingMiles.toFixed(1)} mi to go`}
          </Text>
        </>
      ) : (
        <View style={styles.joinRow}>
          <Button title="Join this race" onPress={join} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
  },
  statSeparator: {
    fontSize: 18,
    color: '#999',
  },
  statTarget: {
    fontSize: 18,
    color: '#666',
  },
  milestoneBanner: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
    color: '#2c9c5f',
    marginTop: 16,
  },
  remaining: {
    textAlign: 'center',
    color: '#666',
    marginTop: 8,
  },
  joinRow: {
    marginTop: 24,
    alignItems: 'center',
  },
});
