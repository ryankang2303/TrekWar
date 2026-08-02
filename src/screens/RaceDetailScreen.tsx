import { useCallback } from 'react';
import { Button, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRoute, RouteProp } from '@react-navigation/native';

import { RivalEntry, useRaceDetail } from '../hooks/useRaces';
import { metersToMiles } from '../lib/geo';
import { highestCrossedMilestone, percentComplete } from '../lib/raceStats';
import RaceProgressPath from '../components/RaceProgressPath';
import { RacesStackParamList } from '../types';

export default function RaceDetailScreen() {
  const route = useRoute<RouteProp<RacesStackParamList, 'RaceDetail'>>();
  const { detail, loading, refresh, join, giveKudos } = useRaceDetail(route.params.raceId);

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

  const { race, template, joined, myDistanceMeters, rivals } = detail;
  const fraction = percentComplete(myDistanceMeters, template.target_meters);
  const milestone = highestCrossedMilestone(fraction);
  const remainingMiles = Math.max(0, metersToMiles(template.target_meters - myDistanceMeters));

  const myRivalIndex = rivals.findIndex((r) => r.isMe);
  const rivalAhead = myRivalIndex > 0 ? rivals[myRivalIndex - 1] : null;
  const gapMiles = rivalAhead ? metersToMiles(rivalAhead.totalMeters - myDistanceMeters) : null;

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
          {gapMiles !== null && gapMiles > 0 && (
            <Text style={styles.rivalHeadline}>
              You're {gapMiles.toFixed(1)} mi from catching {rivalAhead!.profile.display_name}
            </Text>
          )}
          {milestone && <Text style={styles.milestoneBanner}>{milestone.label}</Text>}
          <Text style={styles.remaining}>
            {fraction >= 1
              ? "You've finished this race!"
              : `${remainingMiles.toFixed(1)} mi to go`}
          </Text>

          {rivals.length > 1 && (
            <View style={styles.rivalsSection}>
              <Text style={styles.rivalsHeader}>Standings</Text>
              {rivals.map((rival, index) => (
                <RivalRow
                  key={rival.profile.id}
                  rank={index + 1}
                  rival={rival}
                  onGiveKudos={() => rival.latestProgressId && giveKudos(rival.latestProgressId)}
                />
              ))}
            </View>
          )}
        </>
      ) : (
        <View style={styles.joinRow}>
          <Button title="Join this race" onPress={join} />
        </View>
      )}
    </ScrollView>
  );
}

function RivalRow({
  rank,
  rival,
  onGiveKudos,
}: {
  rank: number;
  rival: RivalEntry;
  onGiveKudos: () => void;
}) {
  const canGiveKudos = !rival.isMe && !!rival.latestProgressId && !rival.kudosGivenByMe;

  return (
    <View style={styles.rivalRow}>
      <Text style={styles.rivalRank}>{rank}</Text>
      <Text style={[styles.rivalName, rival.isMe && styles.rivalNameMe]} numberOfLines={1}>
        {rival.isMe ? 'You' : rival.profile.display_name}
      </Text>
      <Text style={styles.rivalDistance}>{metersToMiles(rival.totalMeters).toFixed(1)} mi</Text>
      {!rival.isMe && (
        <Pressable
          style={[styles.kudosButton, !canGiveKudos && styles.kudosButtonDisabled]}
          onPress={onGiveKudos}
          disabled={!canGiveKudos}
        >
          <Text style={styles.kudosButtonText}>
            👏 {rival.kudosCount > 0 ? rival.kudosCount : ''}
          </Text>
        </Pressable>
      )}
    </View>
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
  rivalHeadline: {
    textAlign: 'center',
    fontSize: 15,
    fontWeight: '600',
    color: '#2c3e50',
    marginTop: 16,
  },
  rivalsSection: {
    marginTop: 32,
  },
  rivalsHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    marginBottom: 8,
  },
  rivalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ddd',
    gap: 10,
  },
  rivalRank: {
    width: 18,
    fontSize: 13,
    color: '#999',
    fontWeight: '600',
  },
  rivalName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  rivalNameMe: {
    fontWeight: '700',
    color: '#2c9c5f',
  },
  rivalDistance: {
    fontSize: 13,
    color: '#666',
  },
  kudosButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#f4f6f8',
    minWidth: 36,
    alignItems: 'center',
  },
  kudosButtonDisabled: {
    opacity: 0.5,
  },
  kudosButtonText: {
    fontSize: 13,
  },
});
