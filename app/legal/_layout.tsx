import { useColorScheme } from '@/hooks/use-color-scheme';
import { Stack } from 'expo-router';

export default function LegalLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerBackTitle: 'Back',
        headerTintColor: isDark ? '#fff' : '#0a7ea4',
        headerStyle: {
          backgroundColor: isDark ? '#1c1c1e' : '#fff',
        },
        headerTitleStyle: {
          color: isDark ? '#fff' : '#000',
        },
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
