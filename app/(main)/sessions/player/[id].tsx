import PlayerDetailView from '@/components/PlayerDetailView';
import { Stack } from 'expo-router';

export default function SessionPlayerDetailScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Player Details' }} />
      <PlayerDetailView />
    </>
  );
}
