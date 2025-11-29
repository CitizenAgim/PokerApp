import { Stack } from 'expo-router';

export default function SessionsLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#0a7ea4',
        },
        headerTintColor: '#fff',
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
