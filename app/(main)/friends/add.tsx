import { useColorScheme } from '@/hooks/use-color-scheme';
import { useFriends } from '@/hooks/useFriends';
import * as friendsService from '@/services/firebase/friends';
import { getThemeColors, addFriendStyles as styles } from '@/styles/friends/index.styles';
import { FRIEND_CODE_CONFIG } from '@/types/friends';
import { User } from '@/types/poker';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AddFriendScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const themeColors = getThemeColors(isDark);
  
  const { sendRequest } = useFriends();
  
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [foundUser, setFoundUser] = useState<User | null>(null);

  const handleCodeChange = async (text: string) => {
    // Only allow alphanumeric characters
    const cleanedText = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setCode(cleanedText);
    setError(null);
    setFoundUser(null);
    setSuccess(false);

    // Auto-search when code is complete
    if (cleanedText.length === FRIEND_CODE_CONFIG.LENGTH) {
      setSearching(true);
      try {
        const user = await friendsService.findUserByFriendCode(cleanedText);
        setFoundUser(user);
        if (!user) {
          setError('No user found with this code');
        }
      } catch (err) {
        setError('Error searching for user');
      } finally {
        setSearching(false);
      }
    }
  };

  const handleSendRequest = async () => {
    if (!foundUser) return;

    setLoading(true);
    setError(null);

    try {
      await sendRequest(code);
      setSuccess(true);
      // Navigate back after a short delay
      setTimeout(() => {
        router.back();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send friend request');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isValidCode = code.length === FRIEND_CODE_CONFIG.LENGTH;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]} edges={['bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {success ? (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={64} color={themeColors.success} />
              </View>
              <Text style={[styles.successTitle, { color: themeColors.success }]}>
                Request Sent!
              </Text>
              <Text style={[styles.successText, { color: themeColors.subText }]}>
                Your friend request has been sent to {foundUser?.displayName}.
              </Text>
            </View>
          ) : (
            <>
              <View style={[styles.inputSection, { backgroundColor: themeColors.card }]}>
                <Text style={[styles.inputLabel, { color: themeColors.text }]}>
                  Enter Friend Code
                </Text>
                <Text style={[styles.inputDescription, { color: themeColors.subText }]}>
                  Ask your friend for their 6-character code and enter it below.
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    isDark && styles.inputDark,
                  ]}
                  value={code}
                  onChangeText={handleCodeChange}
                  placeholder="XXXXXX"
                  placeholderTextColor={themeColors.subText}
                  maxLength={FRIEND_CODE_CONFIG.LENGTH}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoFocus
                />
                
                {error && (
                  <Text style={styles.errorText}>{error}</Text>
                )}
              </View>

              {/* User Preview */}
              {searching && (
                <View style={[styles.userPreview, { backgroundColor: themeColors.card }]}>
                  <ActivityIndicator size="small" color={themeColors.accent} />
                  <Text style={[{ marginLeft: 12, color: themeColors.subText }]}>
                    Searching...
                  </Text>
                </View>
              )}

              {foundUser && !searching && (
                <View style={[styles.userPreview, { backgroundColor: themeColors.card }]}>
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{getInitials(foundUser.displayName)}</Text>
                  </View>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, { color: themeColors.text }]}>
                      {foundUser.displayName}
                    </Text>
                    <Text style={[styles.userCode, { color: themeColors.subText }]}>
                      {foundUser.friendCode}
                    </Text>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  (!isValidCode || !foundUser || loading) && styles.submitButtonDisabled,
                ]}
                onPress={handleSendRequest}
                disabled={!isValidCode || !foundUser || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitButtonText}>Send Friend Request</Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
