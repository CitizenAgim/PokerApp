import { Stack } from 'expo-router';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: '#0a7ea4',
      }}
    >
      <Stack.Screen 
        name="terms" 
        options={{ title: 'Terms of Service' }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ title: 'Privacy Policy' }} 
      />
    </Stack>
  );
}
