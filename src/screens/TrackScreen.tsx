import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';
import { formatElapsed, formatPace, metersToMiles } from '../lib/geo';
import { crossedMilestonesBetween } from '../lib/raceStats';
import { snapshotJoinedRaces } from '../lib/raceMilestones';
import { CompletedActivity, useActivityTracker } from '../hooks/useActivityTracker';

export default function TrackScreen() {
  const { session } = useAuth();
  const { snapshot, permissionError, start, pause, resume, stop } = useActivityTracker();
  const [saving, setSaving] = useState(false);
  const [typeOverride, setTypeOverride] = useState<'walk' | 'run' | null>(null);

  const displayType = typeOverride ?? snapshot.type;

  const handleStart = async () => {
    setTypeOverride(null);
    await start();
  };

  const handleStop = async () => {
    const completed = await stop();
    if (!completed || !session?.user) {
      setTypeOverride(null);
      return;
    }
    await saveActivity(completed, typeOverride);
    setTypeOverride(null);
  };

  const saveActivity = async (completed: CompletedActivity, override: 'walk' | 'run' | null) => {
    if (!session?.user) return;
    setSaving(true);

    // Snapshot joined races' progress *before* inserting — the DB trigger
    // fans this activity's full distance out to every currently-joined race,
    // so diffing prior vs. prior+distance tells us which milestones this
    // single activity just crossed, without a second round-trip after.
    const raceSnapshot = await snapshotJoinedRaces(session.user.id);

    const { error } = await supabase.from('activities').insert({
      user_id: session.user.id,
      type: override ?? completed.type,
      source: 'native',
      distance_meters: completed.distanceMeters,
      duration_seconds: completed.durationSeconds,
      steps: completed.steps,
      started_at: completed.startedAt.toISOString(),
      ended_at: completed.endedAt.toISOString(),
    });
    setSaving(false);

    if (error) {
      Alert.alert('Could not save activity', error.message);
      return;
    }

    const milestoneLines = raceSnapshot.flatMap((race) =>
      crossedMilestonesBetween(
        race.priorMeters,
        race.priorMeters + completed.distanceMeters,
        race.targetMeters
      ).map((m) => `${race.name}: ${m.label}`)
    );

    const summary = `${metersToMiles(completed.distanceMeters).toFixed(2)} mi in ${formatElapsed(completed.durationSeconds)}`;
    Alert.alert('Activity saved', milestoneLines.length ? `${summary}\n\n${milestoneLines.join('\n')}` : summary);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.stat}>{formatElapsed(snapshot.elapsedSeconds)}</Text>
      <Text style={styles.label}>time</Text>

      <Text style={styles.stat}>{metersToMiles(snapshot.distanceMeters).toFixed(2)} mi</Text>
      <Text style={styles.label}>distance</Text>

      <Text style={styles.stat}>
        {formatPace(snapshot.distanceMeters, snapshot.elapsedSeconds)} /mi
      </Text>
      <Text style={styles.label}>pace</Text>

      <Text style={styles.stat}>{snapshot.steps}</Text>
      <Text style={styles.label}>steps</Text>

      {snapshot.status !== 'idle' && (
        <View style={styles.typeRow}>
          <Text style={styles.typeLabel}>Type:</Text>
          <Button
            title={displayType === 'walk' ? '● Walk' : 'Walk'}
            onPress={() => setTypeOverride('walk')}
          />
          <Button
            title={displayType === 'run' ? '● Run' : 'Run'}
            onPress={() => setTypeOverride('run')}
          />
        </View>
      )}

      {permissionError && <Text style={styles.error}>{permissionError}</Text>}

      <View style={styles.controls}>
        {snapshot.status === 'idle' && (
          <Button title="Start" onPress={handleStart} disabled={saving} />
        )}
        {snapshot.status === 'active' && <Button title="Pause" onPress={pause} />}
        {snapshot.status === 'paused' && <Button title="Resume" onPress={resume} />}
        {snapshot.status !== 'idle' && (
          <Button title={saving ? 'Saving…' : 'Save'} onPress={handleStop} disabled={saving} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 4,
  },
  stat: {
    fontSize: 32,
    fontWeight: '700',
  },
  label: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  typeLabel: {
    fontSize: 14,
    color: '#666',
  },
  error: {
    color: '#c0392b',
    textAlign: 'center',
    marginTop: 12,
  },
  controls: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
  },
});
