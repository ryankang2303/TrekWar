import { useState } from 'react';
import { Alert, Button, StyleSheet, Text, TextInput, View } from 'react-native';

import { useAuth } from '../lib/AuthContext';
import { supabase } from '../lib/supabase';

export default function CreateProfileScreen() {
  const { session, refreshProfile } = useAuth();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!session?.user) return;
    if (!username.trim() || !displayName.trim()) {
      Alert.alert('Almost there', 'Please fill in both fields.');
      return;
    }

    setSaving(true);
    const { error } = await supabase.from('profiles').insert({
      id: session.user.id,
      username: username.trim().toLowerCase(),
      display_name: displayName.trim(),
    });
    setSaving(false);

    if (error) {
      Alert.alert('Could not save profile', error.message);
      return;
    }

    await refreshProfile();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set up your profile</Text>
      <TextInput
        style={styles.input}
        placeholder="Username"
        autoCapitalize="none"
        autoCorrect={false}
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Display name"
        value={displayName}
        onChangeText={setDisplayName}
      />
      <Button title={saving ? 'Saving…' : 'Continue'} onPress={handleSave} disabled={saving} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
});
