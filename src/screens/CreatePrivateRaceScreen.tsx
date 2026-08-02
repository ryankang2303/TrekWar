import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { START_PRESETS, START_PRESET_LABELS, StartPreset, useRaceHub } from '../hooks/useRaces';
import { metersToMiles } from '../lib/geo';
import { TIER_LABELS } from '../lib/tiers';
import { RacesStackParamList } from '../types';

export default function CreatePrivateRaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RacesStackParamList, 'CreatePrivateRace'>>();
  const { templates, createPrivateRace } = useRaceHub();
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [preset, setPreset] = useState<StartPreset>('now');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!templateId) {
      Alert.alert('Pick a race', 'Choose a distance/theme for your private race first.');
      return;
    }
    setCreating(true);
    const result = await createPrivateRace(templateId, name, preset);
    setCreating(false);

    if ('error' in result) {
      Alert.alert('Could not create race', result.error);
      return;
    }

    navigation.replace('RaceDetail', { raceId: result.raceId });
    Share.share({
      message: `Join my Trekwar race! Use invite code ${result.inviteCode} in the Races tab.`,
    }).catch(() => {});
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Race</Text>
      {templates.map((template) => (
        <Pressable
          key={template.id}
          style={[styles.templateRow, templateId === template.id && styles.templateRowSelected]}
          onPress={() => setTemplateId(template.id)}
        >
          <View style={styles.templateInfo}>
            <Text style={styles.templateName}>{template.name}</Text>
            <Text style={styles.templateMeta}>
              {TIER_LABELS[template.tier] ?? template.tier} · {metersToMiles(template.target_meters).toFixed(1)} mi
            </Text>
          </View>
          {templateId === template.id && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
      ))}

      <Text style={styles.label}>Name (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Defaults to the race name"
        value={name}
        onChangeText={setName}
      />

      <Text style={styles.label}>Start</Text>
      <View style={styles.presetRow}>
        {START_PRESETS.map((p) => (
          <Pressable
            key={p}
            style={[styles.presetButton, preset === p && styles.presetButtonSelected]}
            onPress={() => setPreset(p)}
          >
            <Text style={[styles.presetButtonText, preset === p && styles.presetButtonTextSelected]}>
              {START_PRESET_LABELS[p]}
            </Text>
          </Pressable>
        ))}
      </View>
      {preset !== 'now' && (
        <Text style={styles.hint}>
          Progress only counts from the start time — everyone begins together, no head start.
        </Text>
      )}

      <Pressable
        style={[styles.createButton, creating && styles.createButtonDisabled]}
        onPress={handleCreate}
        disabled={creating}
      >
        <Text style={styles.createButtonText}>{creating ? 'Creating…' : 'Create & invite'}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2c3e50',
    marginTop: 20,
    marginBottom: 8,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    marginBottom: 8,
  },
  templateRowSelected: {
    borderColor: '#2c3e50',
    backgroundColor: '#f4f6f8',
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontWeight: '600',
  },
  templateMeta: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2c9c5f',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  presetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  presetButtonSelected: {
    backgroundColor: '#2c3e50',
    borderColor: '#2c3e50',
  },
  presetButtonText: {
    fontSize: 13,
    color: '#2c3e50',
    fontWeight: '600',
  },
  presetButtonTextSelected: {
    color: 'white',
  },
  hint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  createButton: {
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 28,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
