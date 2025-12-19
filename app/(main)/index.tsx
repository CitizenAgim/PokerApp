import { auth } from '@/config/firebase';
import { useCurrentSession, useCurrentUser, usePlayers, useSessions } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { startAutoSync, stopAutoSync } from '@/services/sync';
import { getThemeColors, styles } from '@/styles/main/index.styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect } from 'react';
import {
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function HomeScreen() {
  const router = useRouter();
  const { currentSession, loading } = useCurrentSession();
  const { players } = usePlayers();
  const { sessions } = useSessions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = getThemeColors(isDark);

  // Start auto-sync when component mounts
  useEffect(() => {
    startAutoSync(30000); // Sync every 30 seconds
    return () => stopAutoSync();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleSignIn = () => {
    router.push('/(auth)/login');
  };

  const { user } = useCurrentUser();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: themeColors.card, borderBottomColor: themeColors.border }]}>
        <View>
          <Text style={[styles.greeting, { color: themeColors.text }]}>
            Hello, {user?.displayName || user?.email?.split('@')[0] || 'Guest'}!
          </Text>
          {!user && (
            <Text style={{ fontSize: 12, color: themeColors.subText, marginTop: 2 }}>
              Sign in to sync your data
            </Text>
          )}
        </View>
        
        {user ? (
          <TouchableOpacity onPress={handleSignOut} style={styles.signOutBtn}>
            <Ionicons name="log-out-outline" size={24} color={themeColors.subText} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handleSignIn} style={styles.signInBtn}>
            <Text style={styles.signInText}>Sign In</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>Quick Actions</Text>
        
        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: themeColors.card }]}
          onPress={() => router.push('/(main)/sessions/new')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#27ae60' }]}>
            <Ionicons name="add-circle" size={32} color="#fff" />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: themeColors.text }]}>New Session</Text>
            <Text style={[styles.actionDesc, { color: themeColors.subText }]}>Start a new poker session</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={themeColors.chevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: themeColors.card }]}
          onPress={() => router.push('/(main)/players/new')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#3498db' }]}>
            <Ionicons name="person-add" size={32} color="#fff" />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: themeColors.text }]}>Add Player</Text>
            <Text style={[styles.actionDesc, { color: themeColors.subText }]}>Track a new opponent</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={themeColors.chevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionCard, { backgroundColor: themeColors.card }]}
          onPress={() => router.push('/range-editor')}
        >
          <View style={[styles.actionIcon, { backgroundColor: '#9b59b6' }]}>
            <Ionicons name="grid" size={32} color="#fff" />
          </View>
          <View style={styles.actionContent}>
            <Text style={[styles.actionTitle, { color: themeColors.text }]}>Range Editor</Text>
            <Text style={[styles.actionDesc, { color: themeColors.subText }]}>Create hand ranges</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color={themeColors.chevron} />
        </TouchableOpacity>
      </View>

      {/* Active Session */}
      {currentSession && (
        <View style={styles.activeSession}>
          <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>Active Session</Text>
          <TouchableOpacity
            style={[styles.sessionCard, { backgroundColor: themeColors.card }]}
            onPress={() => router.push(`/(main)/sessions/${currentSession.session.id}`)}
          >
            <View style={styles.sessionInfo}>
              <Text style={[styles.sessionName, { color: themeColors.text }]}>{currentSession.session.name}</Text>
              <Text style={[styles.sessionDetails, { color: themeColors.subText }]}>
                {currentSession.session.stakes && `${currentSession.session.stakes} • `}
                {currentSession.session.location || 'No location'}
              </Text>
            </View>
            <View style={styles.sessionLive}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </TouchableOpacity>
        </View>
      )}

      {/* Stats Preview */}
      <View style={styles.statsPreview}>
        <Text style={[styles.sectionTitle, { color: themeColors.sectionTitle }]}>Your Stats</Text>
        <View style={styles.statsRow}>
          <View style={[styles.statBox, { backgroundColor: themeColors.card }]}>
            <Text style={styles.statValue}>{players.length}</Text>
            <Text style={[styles.statLabel, { color: themeColors.subText }]}>Players</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.card }]}>
            <Text style={styles.statValue}>{sessions.length}</Text>
            <Text style={[styles.statLabel, { color: themeColors.subText }]}>Sessions</Text>
          </View>
          <View style={[styles.statBox, { backgroundColor: themeColors.card }]}>
            <Text style={styles.statValue}>--</Text>
            <Text style={[styles.statLabel, { color: themeColors.subText }]}>Hands</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
