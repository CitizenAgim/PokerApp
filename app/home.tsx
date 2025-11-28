import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { auth } from '@/config/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'expo-router';

export default function StartScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.backgroundText}>PokerApp</ThemedText>
      
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <ThemedText style={styles.signOutText}>Sign Out</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundText: {
    fontSize: 48,
    opacity: 0.1,
    position: 'absolute',
    transform: [{ rotate: '-45deg' }],
  },
  signOutButton: {
    position: 'absolute',
    bottom: 50,
    padding: 15,
    backgroundColor: '#ff4444',
    borderRadius: 8,
  },
  signOutText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
