import { ErrorBoundary, OfflineIndicator, ToastProvider } from '@/components/ui';
import { SettingsProvider, useSettingsContext } from '@/contexts/SettingsContext';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { LogBox, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Ignore harmless warnings
LogBox.ignoreLogs([
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const { themeMode } = useSettingsContext();

  const theme = useMemo(() => {
    if (themeMode === 'dark') return DarkTheme;
    if (themeMode === 'light') return DefaultTheme;
    return colorScheme === 'dark' ? DarkTheme : DefaultTheme;
  }, [themeMode, colorScheme]);

  return (
    <ThemeProvider value={theme}>
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
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <SettingsProvider>
          <RootLayoutNav />
        </SettingsProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
