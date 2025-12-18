import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { enableGuestMode } from '@/services/guestMode';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    TouchableOpacity,
    View,
} from 'react-native';
import { getThemeColors, styles } from './_index.styles';

export default function LandingScreen() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeColors = getThemeColors(isDark);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/home');
      } else {
        setLoading(false);
      }
    });
    return unsubscribe;
  }, []);

  const handleContinueAsGuest = async () => {
    await enableGuestMode();
    router.replace('/home');
  };

  if (loading) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#0a7ea4" />
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.content}>
        <ThemedText type="title" style={styles.logo}>
          ♠️ PokerApp
        </ThemedText>
        <ThemedText style={[styles.tagline, { color: themeColors.tagline }]}>
          Your ultimate poker companion
        </ThemedText>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <ThemedText style={styles.primaryButtonText}>Sign In</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: themeColors.secondaryButtonBorder }]}
            onPress={() => router.push('/(auth)/signup')}
          >
            <ThemedText style={[styles.secondaryButtonText, { color: themeColors.secondaryButtonText }]}>
              Create Account
            </ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestButton}
            onPress={handleContinueAsGuest}
          >
            <ThemedText style={[styles.guestButtonText, { color: themeColors.guestButtonText }]}>
              Continue as Guest
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText style={[styles.guestNote, { color: themeColors.guestNote }]}>
          Your data will be saved locally. Sign in later to sync across devices.
        </ThemedText>
      </View>
    </ThemedView>
  );
}
