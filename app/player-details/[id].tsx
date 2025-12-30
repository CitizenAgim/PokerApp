import PlayerDetailView from '@/components/PlayerDetailView';
import { Stack, useRouter } from 'expo-router';

export default function PlayerDetailScreen() {
  const router = useRouter();
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <PlayerDetailView 
        onEditRange={(id, position, action) => {
          router.push(`/player-ranges/${id}?position=${position}&action=${action}`);
        }}
      />
    </>
  );
}
