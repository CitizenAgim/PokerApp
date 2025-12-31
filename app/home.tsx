import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { disableGuestMode, isGuestMode } from '@/services/guestMode';
import { getThemeColors, styles } from '@/styles/home.styles';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = getThemeColors(isDark);

  const handleSignOut = async () => {
    try {
      // Check if guest mode and disable it
      const guestMode = await isGuestMode();
      if (guestMode) {
        await disableGuestMode();
      } else {
        await signOut(auth);
      }
      router.replace('/');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const handleOpenPlayers = () => {
    router.push('/(main)/players');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>Poker Files</ThemedText>
      
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={handleOpenPlayers}
        >
          <ThemedText style={styles.menuButtonText}>👥 Players</ThemedText>
          <ThemedText style={styles.menuDescription}>
            Track and manage player notes
          </ThemedText>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => router.push('/record-hand')}
        >
          <ThemedText style={styles.menuButtonText}>📝 Record Hand</ThemedText>
          <ThemedText style={styles.menuDescription}>
            Quickly record a hand history
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuButton, styles.menuButtonDisabled, { backgroundColor: colors.disabledButton }]}
          disabled
        >
          <ThemedText style={styles.menuButtonText}>🎰 Sessions</ThemedText>
          <ThemedText style={styles.menuDescription}>
            Coming soon...
          </ThemedText>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
