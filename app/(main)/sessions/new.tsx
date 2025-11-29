import { useCurrentSession, useSessions } from '@/hooks';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const STAKES_OPTIONS = ['1/2', '1/3', '2/5', '5/10', '10/20', '25/50'];

export default function NewSessionScreen() {
  const router = useRouter();
  const { createSession } = useSessions();
  const { startSession } = useCurrentSession();
  
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [stakes, setStakes] = useState('');
  const [customStakes, setCustomStakes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const sessionName = name.trim() || `Session ${new Date().toLocaleDateString()}`;
    const sessionStakes = stakes === 'custom' ? customStakes.trim() : stakes;

    try {
      setSaving(true);
      const session = await createSession(
        sessionName,
        location.trim() || undefined,
        sessionStakes || undefined
      );
      
      // Set as current active session
      await startSession(session);
      
      // Navigate to the session
      router.replace(`/(main)/sessions/${session.id}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to create session');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Session Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="game-controller" size={48} color="#fff" />
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Session Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={`Session ${new Date().toLocaleDateString()}`}
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TextInput
              style={styles.input}
              value={location}
              onChangeText={setLocation}
              placeholder="e.g., Bellagio, Home Game"
              placeholderTextColor="#999"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Stakes</Text>
            <View style={styles.stakesGrid}>
              {STAKES_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.stakesOption,
                    stakes === option && styles.stakesOptionActive,
                  ]}
                  onPress={() => setStakes(option)}
                >
                  <Text style={[
                    styles.stakesText,
                    stakes === option && styles.stakesTextActive,
                  ]}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  styles.stakesOption,
                  stakes === 'custom' && styles.stakesOptionActive,
                ]}
                onPress={() => setStakes('custom')}
              >
                <Text style={[
                  styles.stakesText,
                  stakes === 'custom' && styles.stakesTextActive,
                ]}>
                  Other
                </Text>
              </TouchableOpacity>
            </View>
            
            {stakes === 'custom' && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                value={customStakes}
                onChangeText={setCustomStakes}
                placeholder="e.g., 5/5/10"
                placeholderTextColor="#999"
              />
            )}
          </View>
        </View>

        {/* Info */}
        <View style={styles.info}>
          <Ionicons name="information-circle" size={20} color="#0a7ea4" />
          <Text style={styles.infoText}>
            You can assign players to seats after starting the session.
          </Text>
        </View>
      </ScrollView>

      {/* Start Button */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.startButton}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="play" size={20} color="#fff" />
              <Text style={styles.startButtonText}>Start Session</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stakesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stakesOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  stakesOptionActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  stakesText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  stakesTextActive: {
    color: '#fff',
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
