import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';

export default function SessionsLayout() {
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
          title: 'Sessions',
        }}
      />
      <Stack.Screen
        name="new"
        options={{
          title: 'New Session',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Session',
        }}
      />
    </Stack>
  );
}
