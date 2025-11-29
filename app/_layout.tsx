import { ErrorBoundary, OfflineIndicator, ToastProvider } from '@/components/ui';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <ToastProvider>
            <View style={{ flex: 1 }}>
              <OfflineIndicator />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" />
                <Stack.Screen name="(auth)" />
                <Stack.Screen name="(main)" />
                <Stack.Screen name="range-editor" />
              </Stack>
            </View>
          </ToastProvider>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
