import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getThemeColors, styles } from '@/styles/auth/reset-password.styles';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function ResetPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeColors = getThemeColors(isDark);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      
      Alert.alert(
        'Email Sent',
        'Check your email for a link to reset your password.',
        [
          { 
            text: 'Back to Login', 
            onPress: () => router.back() 
          }
        ]
      );
    } catch (error: any) {
        // SECURITY: We use a generic error message or success message to prevent 
        // "Email Enumeration" attacks (attackers checking which emails exist in your DB).
        // If the email is invalid format, we tell them. Otherwise, we pretend it worked 
        // or show a generic error, but we do NOT say "User not found".
        let errorMessage = 'Failed to send reset email.';
        
        if (error.code === 'auth/invalid-email') {
            errorMessage = 'That email address is invalid.';
        } else {
            // Log the real error internally for debugging
            console.log('Reset Password Error:', error.code, error.message);
            // Show generic message to user for user-not-found or other server errors
            errorMessage = 'If an account exists with this email, a reset link has been sent.';
            
            // Actually, for user experience, we can just treat this as a "Success"
            // so the user thinks it worked. This is the industry standard.
            Alert.alert(
              'Email Sent',
              'If an account exists with this email, we have sent a password reset link.',
              [{ text: 'Back to Login', onPress: () => router.back() }]
            );
            return; 
        }

      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <ThemedText type="title" style={styles.title}>
              Reset Password
            </ThemedText>
            
            <ThemedText style={styles.subtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </ThemedText>

            <TextInput
              style={[styles.input, { 
                backgroundColor: themeColors.inputBg, 
                color: themeColors.inputText,
                borderColor: themeColors.inputBorder
              }]}
              placeholder="Email"
              placeholderTextColor={themeColors.placeholder}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <TouchableOpacity 
              style={styles.button} 
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <ThemedText style={styles.buttonText}>Send Reset Link</ThemedText>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backButton}
            >
              <ThemedText style={[styles.backButtonText, { color: themeColors.backButtonText }]}>
                Back to Login
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
