import { auth } from '@/config/firebase';
import { useCurrentUser, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { disableGuestMode, hasGuestData, isGuestMode, migrateGuestDataToUser } from '@/services/guestMode';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { 
    themeMode, setThemeMode,
    language, setLanguage,
    currency, setCurrency,
    country, setCountry,
    dateFormat, setDateFormat,
    timeFormat, setTimeFormat
  } = useSettings();

  const { user, loading: userLoading, updateProfile } = useCurrentUser();
  const currentUser = auth.currentUser;

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDateFormatModal, setShowDateFormatModal] = useState(false);

  // Profile State
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [guestModeActive, setGuestModeActive] = useState(false);
  const [hasGuestDataPending, setHasGuestDataPending] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Check guest mode status
  useEffect(() => {
    const checkGuestStatus = async () => {
      const isGuest = await isGuestMode();
      setGuestModeActive(isGuest);
      
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

  const themeColors = {
    background: isDark ? '#000' : '#f5f5f5',
    card: isDark ? '#1c1c1e' : '#fff',
    text: isDark ? '#fff' : '#333',
    subText: isDark ? '#aaa' : '#666',
    headerBg: isDark ? '#1c1c1e' : '#fff',
    border: isDark ? '#333' : '#e0e0e0',
    icon: isDark ? '#aaa' : '#666',
    settingIconBg: isDark ? '#2c2c2e' : '#f0f0f0',
    themeOptionBg: isDark ? '#2c2c2e' : '#f5f5f5',
    modalOverlay: 'rgba(0,0,0,0.5)',
    modalBg: isDark ? '#1c1c1e' : '#fff',
    bannerBg: isDark ? '#0d2b3a' : '#e3f2fd',
    inputBg: isDark ? '#2c2c2e' : '#f5f5f5',
    cancelEditButtonBg: isDark ? '#333' : '#f0f0f0',
    editButtonBg: isDark ? '#0a7ea420' : '#f0f9ff',
    signOutBorder: '#e74c3c',
  };

  const displayUserName = guestModeActive ? 'Guest User' : (user?.displayName || currentUser?.displayName || 'User');
  const email = guestModeActive ? 'Not signed in' : (user?.email || currentUser?.email || '');

  const renderSectionHeader = (title: string) => (
    <Text style={[styles.sectionHeader, { color: themeColors.subText }]}>{title}</Text>
  );

  const renderSettingItem = (
    icon: keyof typeof Ionicons.glyphMap, 
    title: string, 
    value: string | React.ReactNode, 
    onPress?: () => void,
    showChevron = true
  ) => (
    <TouchableOpacity 
      style={[styles.settingItem, { backgroundColor: themeColors.card }]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={[styles.settingIcon, { backgroundColor: themeColors.settingIconBg }]}>
        <Ionicons name={icon} size={22} color={themeColors.icon} />
      </View>
      <View style={styles.settingContent}>
        <Text style={[styles.settingText, { color: themeColors.text }]}>{title}</Text>
      </View>
      <View style={styles.settingRight}>
        {typeof value === 'string' ? (
          <Text style={[styles.settingValue, { color: themeColors.subText }]}>{value}</Text>
        ) : (
          value
        )}
        {showChevron && <Ionicons name="chevron-forward" size={20} color={themeColors.icon} />}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: themeColors.headerBg, borderBottomColor: themeColors.border }]}>
        <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>
      </View>
      
      <ScrollView style={styles.content}>
        {/* Guest Mode Banner */}
        {guestModeActive && (
          <View style={[styles.guestBanner, { backgroundColor: themeColors.bannerBg }]}>
            <Ionicons name="information-circle" size={24} color="#0a7ea4" />
            <View style={styles.guestBannerText}>
              <Text style={styles.guestBannerTitle}>Guest Mode</Text>
              <Text style={[styles.guestBannerSubtitle, { color: themeColors.subText }]}>
                Sign in to sync data
              </Text>
            </View>
            <TouchableOpacity style={styles.guestSignInButton} onPress={handleSignIn}>
               <Text style={styles.guestSignInButtonText}>Sign In</Text>
            </TouchableOpacity>
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
        {!guestModeActive && (
          <View style={styles.profileHeader}>
            {editing ? (
               <View style={styles.editContainer}>
                  <TextInput 
                    style={[styles.editInput, { color: themeColors.text, backgroundColor: themeColors.inputBg }]}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoFocus
                    placeholder="Display Name"
                    placeholderTextColor={themeColors.subText}
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity onPress={() => setEditing(false)} style={styles.editActionBtn}>
                      <Ionicons name="close-circle" size={32} color={themeColors.subText} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSaveProfile} style={styles.editActionBtn}>
                      <Ionicons name="checkmark-circle" size={32} color="#0a7ea4" />
                    </TouchableOpacity>
                  </View>
               </View>
            ) : (
              <View style={styles.profileContent}>
                <TouchableOpacity onPress={handleStartEdit} style={styles.avatarContainer}>
                   <Text style={styles.avatarText}>{displayUserName.charAt(0).toUpperCase()}</Text>
                   <View style={[styles.editBadge, { backgroundColor: themeColors.card }]}>
                     <Ionicons name="pencil" size={12} color={themeColors.icon} />
                   </View>
                </TouchableOpacity>
                <Text style={[styles.profileName, { color: themeColors.text }]}>{displayUserName}</Text>
                <Text style={[styles.profileEmail, { color: themeColors.subText }]}>{email}</Text>
              </View>
            )}
          </View>
        )}

        {/* General Settings */}
        {renderSectionHeader('GENERAL')}
        
        {renderSettingItem('language', 'Language', 'English', undefined, false)}
        
        <View style={[styles.settingItem, { backgroundColor: themeColors.card }]}>
          <View style={[styles.settingIcon, { backgroundColor: themeColors.settingIconBg }]}>
            <Ionicons name="flag-outline" size={22} color={themeColors.icon} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>Country</Text>
          </View>
          <TextInput
            style={[styles.input, { color: themeColors.text }]}
            value={country}
            onChangeText={setCountry}
            placeholder="Enter Country"
            placeholderTextColor={themeColors.subText}
            textAlign="right"
          />
        </View>

        {renderSettingItem('notifications-outline', 'Notifications', '', () => {})}
        {renderSettingItem('cloud-outline', 'Sync Settings', '', () => {})}

        {/* Appearance */}
        {renderSectionHeader('APPEARANCE')}
        
        <View style={[styles.settingItem, { backgroundColor: themeColors.card, flexDirection: 'column', alignItems: 'stretch', paddingVertical: 16 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <View style={[styles.settingIcon, { backgroundColor: themeColors.settingIconBg }]}>
              <Ionicons name="moon-outline" size={22} color={themeColors.icon} />
            </View>
            <Text style={[styles.settingText, { color: themeColors.text }]}>App Theme</Text>
          </View>
          <View style={styles.themeSelector}>
            {(['system', 'light', 'dark'] as const).map((mode) => (
              <TouchableOpacity
                key={mode}
                style={[
                  styles.themeOption,
                  { backgroundColor: themeColors.themeOptionBg },
                  themeMode === mode && styles.themeOptionActive
                ]}
                onPress={() => {
                  haptics.lightTap();
                  setThemeMode(mode);
                }}
              >
                <Text style={[
                  styles.themeOptionText,
                  { color: themeColors.subText },
                  themeMode === mode && styles.themeOptionTextActive
                ]}>
                  {mode.charAt(0).toUpperCase() + mode.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Formats */}
        {renderSectionHeader('FORMATS')}

        {renderSettingItem('cash-outline', 'Currency', currency, () => setShowCurrencyModal(true))}
        
        {renderSettingItem('calendar-outline', 'Date Format', dateFormat, () => setShowDateFormatModal(true))}

        <View style={[styles.settingItem, { backgroundColor: themeColors.card }]}>
          <View style={[styles.settingIcon, { backgroundColor: themeColors.settingIconBg }]}>
            <Ionicons name="time-outline" size={22} color={themeColors.icon} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>24-Hour Time</Text>
          </View>
          <Switch
            value={timeFormat === '24h'}
            onValueChange={(val) => {
              haptics.lightTap();
              setTimeFormat(val ? '24h' : '12h');
            }}
            trackColor={{ false: isDark ? '#333' : '#e0e0e0', true: '#81c784' }}
            thumbColor={timeFormat === '24h' ? '#27ae60' : '#f5f5f5'}
          />
        </View>

        {/* Support & Legal */}
        {renderSectionHeader('SUPPORT & LEGAL')}
        {renderSettingItem('shield-checkmark-outline', 'Privacy Policy', '', () => router.push('/legal/privacy'))}
        {renderSettingItem('document-text-outline', 'Terms of Service', '', () => router.push('/legal/terms'))}
        {renderSettingItem('help-circle-outline', 'Help & Support', '', () => {})}
        {renderSettingItem('information-circle-outline', 'About', 'v1.0.2', () => {})}

        {/* Sign Out / Exit Guest Mode - Only show when logged in */}
        {currentUser && (
          <TouchableOpacity style={[styles.signOutButton, { backgroundColor: themeColors.card, borderColor: themeColors.signOutBorder }]} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color="#e74c3c" />
            <Text style={styles.signOutText}>{guestModeActive ? 'Exit Guest Mode' : 'Sign Out'}</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: themeColors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowCurrencyModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Currency</Text>
            {(['USD', 'EUR', 'GBP'] as const).map((curr) => (
              <TouchableOpacity
                key={curr}
                style={[styles.modalOption, currency === curr && { backgroundColor: themeColors.themeOptionBg }]}
                onPress={() => {
                  setCurrency(curr);
                  setShowCurrencyModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: themeColors.text }]}>{curr}</Text>
                {currency === curr && <Ionicons name="checkmark" size={20} color="#0a7ea4" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Date Format Modal */}
      <Modal
        visible={showDateFormatModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDateFormatModal(false)}
      >
        <TouchableOpacity 
          style={[styles.modalOverlay, { backgroundColor: themeColors.modalOverlay }]}
          activeOpacity={1}
          onPress={() => setShowDateFormatModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]}>
            <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Date Format</Text>
            {(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD'] as const).map((fmt) => (
              <TouchableOpacity
                key={fmt}
                style={[styles.modalOption, dateFormat === fmt && { backgroundColor: themeColors.themeOptionBg }]}
                onPress={() => {
                  setDateFormat(fmt);
                  setShowDateFormatModal(false);
                }}
              >
                <Text style={[styles.modalOptionText, { color: themeColors.text }]}>{fmt}</Text>
                {dateFormat === fmt && <Ionicons name="checkmark" size={20} color="#0a7ea4" />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
    marginLeft: 4,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
  },
  themeSelector: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 2,
    gap: 8,
  },
  themeOption: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  themeOptionActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  themeOptionTextActive: {
    color: '#0a7ea4',
    fontWeight: '600',
  },
  input: {
    fontSize: 16,
    minWidth: 100,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalOptionText: {
    fontSize: 16,
  },
  // Profile Styles
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 16,
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
    marginTop: 2,
  },
  guestSignInButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#0a7ea4',
    borderRadius: 16,
  },
  guestSignInButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  syncBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    padding: 16,
    marginBottom: 16,
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
    marginBottom: 24,
    marginTop: 8,
  },
  profileContent: {
    alignItems: 'center',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    position: 'relative',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#fff',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  profileName: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
  },
  editContainer: {
    width: '100%',
    alignItems: 'center',
  },
  editInput: {
    width: '80%',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 16,
  },
  editActions: {
    flexDirection: 'row',
    gap: 24,
  },
  editActionBtn: {
    padding: 8,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    padding: 16,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
  },
  signOutText: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: '600',
  },
});
