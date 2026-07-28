import { createNativeStackNavigator } from '@react-navigation/native-stack';

import RaceHubScreen from '../screens/RaceHubScreen';
import RaceDetailScreen from '../screens/RaceDetailScreen';
import { RacesStackParamList } from '../types';

const Stack = createNativeStackNavigator<RacesStackParamList>();

export default function RacesStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Stack.Screen name="RaceHub" component={RaceHubScreen} options={{ title: 'Races' }} />
      <Stack.Screen name="RaceDetail" component={RaceDetailScreen} options={{ title: '' }} />
    </Stack.Navigator>
  );
}
