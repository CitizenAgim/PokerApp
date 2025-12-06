import { ProfileSkeleton } from '@/components/ui';
import { auth } from '@/config/firebase';
import { useCurrentUser, usePlayers, useSessions } from '@/hooks';
import { disableGuestMode, hasGuestData, isGuestMode, migrateGuestDataToUser } from '@/services/guestMode';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, loading: userLoading, updateProfile } = useCurrentUser();
  const { players, refreshPlayers } = usePlayers();
  const { sessions } = useSessions();
  
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [guestModeActive, setGuestModeActive] = useState(false);
  const [hasGuestDataPending, setHasGuestDataPending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const currentUser = auth.currentUser;

  // Check guest mode status on mount and when user changes
  useEffect(() => {
    const checkGuestStatus = async () => {
      const isGuest = await isGuestMode();
      setGuestModeActive(isGuest);
      
      // If logged in, check if there's guest data to migrate
      if (currentUser && !isGuest) {
        const hasData = await hasGuestData();
        setHasGuestDataPending(hasData);
      }
    };
    checkGuestStatus();
  }, [currentUser]);

  const handleStartEdit = () => {
    haptics.lightTap();
    setDisplayName(user?.displayName || currentUser?.displayName || '');
    setEditing(true);
  };

  const handleCreateAccount = () => {
    haptics.lightTap();
    router.push('/(auth)/signup');
  };

  const handleSignIn = () => {
    haptics.lightTap();
    router.push('/(auth)/login');
  };

  const handleSyncGuestData = async () => {
    if (!currentUser) return;
    
    haptics.lightTap();
    Alert.alert(
      'Sync Local Data',
      'This will upload all your locally saved players and data to your account. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sync Now',
          onPress: async () => {
            try {
              setSyncing(true);
              await migrateGuestDataToUser(currentUser.uid);
              await refreshPlayers();
              setHasGuestDataPending(false);
              haptics.successFeedback();
              Alert.alert('Success', 'Your local data has been synced to your account!');
            } catch (error) {
              haptics.errorFeedback();
              console.error('Sync error:', error);
              Alert.alert('Error', 'Failed to sync data. Please try again.');
            } finally {
              setSyncing(false);
            }
          },
        },
      ]
    );
  };

  const handleSaveProfile = async () => {
    if (!displayName.trim()) {
      haptics.errorFeedback();
      Alert.alert('Error', 'Display name cannot be empty');
      return;
    }

    try {
      setSaving(true);
      await updateProfile({ displayName: displayName.trim() });
      haptics.successFeedback();
      setEditing(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      haptics.errorFeedback();
      Alert.alert('Error', 'Failed to update profile');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    haptics.warningFeedback();
    
    if (guestModeActive) {
      // Guest mode - warn about data loss
      Alert.alert(
        'Exit Guest Mode',
        'You are using the app as a guest. Your local data will be preserved, but you\'ll need to sign in to access cloud features.\n\nWould you like to create an account first?',
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Create Account', 
            onPress: () => router.push('/(auth)/signup')
          },
          {
            text: 'Exit',
            style: 'destructive',
            onPress: async () => {
              await disableGuestMode();
              router.replace('/');
            },
          },
        ]
      );
    } else {
      Alert.alert(
        'Sign Out',
        'Are you sure you want to sign out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Sign Out',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOut(auth);
                router.replace('/');
              } catch (error) {
                console.error('Error signing out:', error);
              }
            },
          },
        ]
      );
    }
  };

  if (userLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ProfileSkeleton />
      </SafeAreaView>
    );
  }

  const displayUserName = guestModeActive ? 'Guest User' : (user?.displayName || currentUser?.displayName || 'User');
  const email = guestModeActive ? 'Not signed in' : (user?.email || currentUser?.email || '');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Guest Mode Banner */}
        {guestModeActive && (
          <View style={styles.guestBanner}>
            <Ionicons name="information-circle" size={24} color="#0a7ea4" />
            <View style={styles.guestBannerText}>
              <Text style={styles.guestBannerTitle}>You're using Guest Mode</Text>
              <Text style={styles.guestBannerSubtitle}>
                Create an account to sync your data across devices
              </Text>
            </View>
          </View>
        )}

        {/* Sync Guest Data Banner */}
        {hasGuestDataPending && !guestModeActive && (
          <TouchableOpacity style={styles.syncBanner} onPress={handleSyncGuestData} disabled={syncing}>
            <Ionicons name="cloud-upload" size={24} color="#fff" />
            <View style={styles.syncBannerText}>
              <Text style={styles.syncBannerTitle}>Local Data Available</Text>
              <Text style={styles.syncBannerSubtitle}>
                Tap to sync your guest data to your account
              </Text>
            </View>
            {syncing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        )}

        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={[styles.avatarLarge, guestModeActive && styles.avatarGuest]}>
            <Text style={styles.avatarLargeText}>
              {guestModeActive ? '?' : displayUserName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          {editing ? (
            <View style={styles.editContainer}>
              <TextInput
                style={styles.editInput}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Display Name"
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity
                  style={styles.cancelEditButton}
                  onPress={() => setEditing(false)}
                >
                  <Text style={styles.cancelEditText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={handleSaveProfile}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : guestModeActive ? (
            <>
              <Text style={styles.profileName}>{displayUserName}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <View style={styles.guestActions}>
                <TouchableOpacity style={styles.createAccountButton} onPress={handleCreateAccount}>
                  <Ionicons name="person-add" size={16} color="#fff" />
                  <Text style={styles.createAccountText}>Create Account</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
                  <Text style={styles.signInText}>Sign In</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.profileName}>{displayUserName}</Text>
              <Text style={styles.profileEmail}>{email}</Text>
              <TouchableOpacity style={styles.editButton} onPress={handleStartEdit}>
                <Ionicons name="pencil" size={16} color="#0a7ea4" />
                <Text style={styles.editButtonText}>Edit Profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Stats */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Ionicons name="people" size={24} color="#0a7ea4" />
              <Text style={styles.statValue}>{players.length}</Text>
              <Text style={styles.statLabel}>Players Tracked</Text>
            </View>
            <View style={styles.statCard}>
              <Ionicons name="game-controller" size={24} color="#27ae60" />
              <Text style={styles.statValue}>{sessions.length}</Text>
              <Text style={styles.statLabel}>Sessions</Text>
            </View>
          </View>
        </View>

        {/* Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="notifications-outline" size={22} color="#666" />
            </View>
            <Text style={styles.settingText}>Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="cloud-outline" size={22} color="#666" />
            </View>
            <Text style={styles.settingText}>Sync Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="shield-checkmark-outline" size={22} color="#666" />
            </View>
            <Text style={styles.settingText}>Privacy</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="help-circle-outline" size={22} color="#666" />
            </View>
            <Text style={styles.settingText}>Help & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingIcon}>
              <Ionicons name="information-circle-outline" size={22} color="#666" />
            </View>
            <Text style={styles.settingText}>About</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Sign Out / Exit Guest Mode */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
          <Text style={styles.signOutText}>{guestModeActive ? 'Exit Guest Mode' : 'Sign Out'}</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>Version 1.0.0 </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e3f2fd',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  guestBannerText: {
    flex: 1,
  },
  guestBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  guestBannerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    gap: 12,
  },
  syncBannerText: {
    flex: 1,
  },
  syncBannerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  syncBannerSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarGuest: {
    backgroundColor: '#888',
  },
  avatarLargeText: {
    fontSize: 40,
    fontWeight: '600',
    color: '#fff',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: '#888',
    marginBottom: 16,
  },
  guestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  createAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#0a7ea4',
    borderRadius: 25,
  },
  createAccountText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
  signInButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#0a7ea4',
  },
  signInText: {
    fontSize: 15,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f9ff',
    borderRadius: 20,
  },
  editButtonText: {
    fontSize: 14,
    color: '#0a7ea4',
    fontWeight: '500',
  },
  editContainer: {
    width: '100%',
    paddingHorizontal: 20,
  },
  editInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  cancelEditButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  cancelEditText: {
    fontSize: 14,
    color: '#666',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#0a7ea4',
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  statsSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
    textAlign: 'center',
  },
  settingsSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: '#e74c3c',
  },
  signOutText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 14,
    color: '#999',
  },
});
