import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

import { useRaceHub } from '../hooks/useRaces';
import { RacesStackParamList } from '../types';

export default function JoinPrivateRaceScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RacesStackParamList, 'JoinPrivateRace'>>();
  const { joinPrivateRace } = useRaceHub();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setJoining(true);
    const result = await joinPrivateRace(code);
    setJoining(false);

    if ('error' in result) {
      Alert.alert('Could not join', result.error);
      return;
    }
    navigation.replace('RaceDetail', { raceId: result.raceId });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Enter invite code</Text>
      <TextInput
        style={styles.input}
        placeholder="ABC123"
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={6}
        value={code}
        onChangeText={setCode}
      />
      <Pressable style={[styles.button, joining && styles.buttonDisabled]} onPress={handleJoin} disabled={joining}>
        <Text style={styles.buttonText}>{joining ? 'Joining…' : 'Join race'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 14,
    fontSize: 20,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#2c3e50',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '700',
  },
});
