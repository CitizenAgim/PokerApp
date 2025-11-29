import { Stack } from 'expo-router';

export default function PlayersLayout() {
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
