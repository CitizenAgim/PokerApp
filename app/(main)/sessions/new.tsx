import { useCurrentSession, useSessions } from '@/hooks';
import * as localStorage from '@/services/localStorage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const GAME_TYPES = ['Texas Holdem', 'PLO', 'PLO5', 'Short Deck'];

export default function NewSessionScreen() {
  const router = useRouter();
  const { createSession } = useSessions();
  const { startSession } = useCurrentSession();

  // Form State
  const [gameType, setGameType] = useState(GAME_TYPES[0]);
  const [location, setLocation] = useState('');
  const [smallBlind, setSmallBlind] = useState('');
  const [bigBlind, setBigBlind] = useState('');
  const [thirdBlind, setThirdBlind] = useState('');
  const [ante, setAnte] = useState('');
  const [buyIn, setBuyIn] = useState('');
  
  // Location Management
  const [locations, setLocations] = useState<string[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocations();
    loadLastConfig();
  }, []);

  const loadLocations = async () => {
    const saved = await localStorage.getLocations();
    setLocations(saved);
  };

  const loadLastConfig = async () => {
    const config = await localStorage.getLastSessionConfig();
    if (config) {
      setLocation(config.location);
      setGameType(config.gameType);
      setSmallBlind(config.smallBlind);
      setBigBlind(config.bigBlind);
      setThirdBlind(config.thirdBlind);
      setAnte(config.ante);
      setBuyIn(config.buyIn);
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    const loc = newLocation.trim();
    setLocation(loc);
    setNewLocation('');
    setShowLocationModal(false);
    // It will be saved to storage when the session is created
  };

  const handleSave = async () => {
    if (!location) {
      Alert.alert('Missing Information', 'Please select or enter a location.');
      return;
    }
    if (!smallBlind || !bigBlind) {
      Alert.alert('Missing Information', 'Please enter Small and Big blinds.');
      return;
    }
    if (!buyIn) {
      Alert.alert('Missing Information', 'Please enter the Buy-in amount.');
      return;
    }

    try {
      setSaving(true);
      
      const sb = parseFloat(smallBlind);
      const bb = parseFloat(bigBlind);
      const bi = parseFloat(buyIn);
      const tb = thirdBlind ? parseFloat(thirdBlind) : undefined;
      const ant = ante ? parseFloat(ante) : undefined;

      const session = await createSession(
        location,
        gameType,
        sb,
        bb,
        bi,
        tb,
        ant
      );
      
      // Save config for next time
      await localStorage.saveLastSessionConfig({
        location,
        gameType,
        smallBlind,
        bigBlind,
        thirdBlind,
        ante,
        buyIn
      });

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
        {/* Header Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="game-controller" size={40} color="#fff" />
          </View>
          <Text style={styles.headerTitle}>New Session</Text>
        </View>

        <View style={styles.form}>
          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowLocationModal(true)}
            >
              <Text style={[styles.selectButtonText, !location && styles.placeholderText]}>
                {location || 'Select Location'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Game Type */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Game Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gameTypeScroll}>
              {GAME_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.gameTypeOption,
                    gameType === type && styles.gameTypeOptionActive,
                  ]}
                  onPress={() => setGameType(type)}
                >
                  <Text style={[
                    styles.gameTypeText,
                    gameType === type && styles.gameTypeTextActive,
                  ]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Blinds */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Blinds</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={styles.subLabel}>Small</Text>
                <TextInput
                  style={styles.input}
                  value={smallBlind}
                  onChangeText={setSmallBlind}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.subLabel}>Big</Text>
                <TextInput
                  style={styles.input}
                  value={bigBlind}
                  onChangeText={setBigBlind}
                  keyboardType="numeric"
                  placeholder="2"
                  placeholderTextColor="#999"
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={styles.subLabel}>3rd (Opt)</Text>
                <TextInput
                  style={styles.input}
                  value={thirdBlind}
                  onChangeText={setThirdBlind}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor="#999"
                />
              </View>
            </View>
          </View>

          {/* Ante & Buy-in */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Ante (Optional)</Text>
              <TextInput
                style={styles.input}
                value={ante}
                onChangeText={setAnte}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#999"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Buy-in</Text>
              <TextInput
                style={styles.input}
                value={buyIn}
                onChangeText={setBuyIn}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
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

      {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.addLocationContainer}>
              <TextInput
                style={styles.addLocationInput}
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder="Add new location..."
                placeholderTextColor="#999"
              />
              <TouchableOpacity 
                style={styles.addLocationButton}
                onPress={handleAddLocation}
              >
                <Ionicons name="add" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            <FlatList
              data={locations}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.locationItem}
                  onPress={() => {
                    setLocation(item);
                    setShowLocationModal(false);
                  }}
                >
                  <Ionicons name="location-outline" size={20} color="#666" />
                  <Text style={styles.locationText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.emptyText}>No saved locations yet</Text>
              }
            />
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#27ae60',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
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
  subLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
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
  selectButton: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  gameTypeScroll: {
    flexDirection: 'row',
  },
  gameTypeOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginRight: 8,
  },
  gameTypeOptionActive: {
    backgroundColor: '#0a7ea4',
    borderColor: '#0a7ea4',
  },
  gameTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  gameTypeTextActive: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
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
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  addLocationContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  addLocationInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  addLocationButton: {
    backgroundColor: '#0a7ea4',
    width: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    gap: 12,
  },
  locationText: {
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
});
