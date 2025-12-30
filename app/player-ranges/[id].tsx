import PlayerRangeView from '@/components/PlayerRangeView';
import { Stack } from 'expo-router';

export default function PlayerRangeScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PlayerRangeView />
    </>
  );
}
