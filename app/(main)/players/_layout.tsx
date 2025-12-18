import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';

export default function PlayersLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: isDark ? '#1c1c1e' : '#0a7ea4',
        },
        headerTintColor: isDark ? '#fff' : '#fff',
        headerTitleStyle: {
          fontWeight: '600',
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Players',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'Add Player',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]/index"
        options={{
          title: 'Player Details',
        }}
      />
      <Stack.Screen
        name="[id]/range"
        options={{
          title: 'Edit Range',
        }}
      />
    </Stack>
  );
}
