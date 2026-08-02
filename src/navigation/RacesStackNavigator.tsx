import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RaceHubScreen from '../screens/RaceHubScreen';
import RaceDetailScreen from '../screens/RaceDetailScreen';
import CreatePrivateRaceScreen from '../screens/CreatePrivateRaceScreen';
import JoinPrivateRaceScreen from '../screens/JoinPrivateRaceScreen';
import { RacesStackParamList } from '../types';

const Stack = createNativeStackNavigator<RacesStackParamList>();

export default function RacesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="RaceHub" component={RaceHubScreen} options={{ title: 'Races' }} />
      <Stack.Screen name="RaceDetail" component={RaceDetailScreen} options={{ title: '' }} />
      <Stack.Screen
        name="CreatePrivateRace"
        component={CreatePrivateRaceScreen}
        options={{ title: 'Create private race' }}
      />
      <Stack.Screen
        name="JoinPrivateRace"
        component={JoinPrivateRaceScreen}
        options={{ title: 'Join private race' }}
      />
    </Stack.Navigator>
  );
}
