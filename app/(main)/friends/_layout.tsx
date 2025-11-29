import { Stack } from 'expo-router';

export default function FriendsLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Friends',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: 'Add Friend',
          presentation: 'modal',
        }}
      />
    </Stack>
  );
}
