import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { auth } from '@/config/firebase';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { disableGuestMode } from '@/services/guestMode';
import { getThemeColors, styles } from '@/styles/auth/login.styles';
import * as Google from 'expo-auth-session/providers/google';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { GoogleAuthProvider, signInWithCredential, signInWithEmailAndPassword } from 'firebase/auth';
import { useEffect, useState } from 'react';
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

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = '432275305630-fd33knmjq7nouo9ra7lldjrg86jio2r0.apps.googleusercontent.com';
// TODO: Replace with your actual iOS Client ID from Google Cloud Console
const GOOGLE_IOS_CLIENT_ID = 'YOUR_IOS_CLIENT_ID_HERE';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const themeColors = getThemeColors(isDark);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      const credential = GoogleAuthProvider.credential(id_token);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(async () => {
          // Disable guest mode when user signs in
          await disableGuestMode();
          router.replace('/(main)');
        })
        .catch((error) => {
          Alert.alert('Error', error.message);
          setLoading(false);
        });
    }
  }, [response]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Disable guest mode when user signs in
      await disableGuestMode();
      router.replace('/(main)');
    } catch (error: any) {
      Alert.alert('Error', error.message);
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    promptAsync();
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
              Welcome Back
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

            <TextInput
              style={[styles.input, { 
                backgroundColor: themeColors.inputBg, 
                color: themeColors.inputText,
                borderColor: themeColors.inputBorder
              }]}
              placeholder="Password"
              placeholderTextColor={themeColors.placeholder}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
              <ThemedText style={styles.buttonText}>Sign In</ThemedText>
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={[styles.dividerLine, { backgroundColor: themeColors.dividerLine }]} />
              <ThemedText style={styles.dividerText}>or</ThemedText>
              <View style={[styles.dividerLine, { backgroundColor: themeColors.dividerLine }]} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, { 
                backgroundColor: themeColors.googleButtonBg,
                borderWidth: isDark ? 0 : 1,
                borderColor: themeColors.googleButtonBorder
              }]}
              onPress={handleGoogleSignIn}
              disabled={!request}
            >
              <ThemedText style={[styles.googleButtonText, { color: themeColors.googleButtonText }]}>Continue with Google</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/signup')}
              style={styles.switchButton}
            >
              <ThemedText style={styles.switchText}>
                Don't have an account? Sign Up
              </ThemedText>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}
