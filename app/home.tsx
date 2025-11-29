import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth } from '@/config/firebase';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function HomeScreen() {
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out: ', error);
    }
  };

  const handleOpenRangeEditor = () => {
    router.push('/range-editor');
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.title}>PokerApp</ThemedText>
      
      <View style={styles.menuContainer}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={handleOpenRangeEditor}
        >
          <ThemedText style={styles.menuButtonText}>📊 Range Editor</ThemedText>
          <ThemedText style={styles.menuDescription}>
            Create and edit hand ranges
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuButton, styles.menuButtonDisabled]}
          disabled
        >
          <ThemedText style={styles.menuButtonText}>👥 Players</ThemedText>
          <ThemedText style={styles.menuDescription}>
            Coming soon...
          </ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.menuButton, styles.menuButtonDisabled]}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 40,
  },
  menuContainer: {
    gap: 16,
  },
  menuButton: {
    backgroundColor: '#0a7ea4',
    padding: 20,
    borderRadius: 12,
  },
  menuButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.7,
  },
  menuButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  menuDescription: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    marginTop: 4,
  },
  signOutButton: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    padding: 15,
    backgroundColor: '#ff4444',
    borderRadius: 8,
    alignItems: 'center',
  },
  signOutText: {
    color: '#fff',
    fontWeight: 'bold',
  }
});
