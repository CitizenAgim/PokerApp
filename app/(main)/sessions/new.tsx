import { useCurrentSession, useSessions } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as localStorage from '@/services/localStorage';
import { getThemeColors, styles } from '@/styles/sessions/new.styles';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = getThemeColors(isDark);

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
  const isSaving = useRef(false);

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
    if (isSaving.current) return;

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
      isSaving.current = true;
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
      isSaving.current = false;
      setSaving(false);
    }
    // Note: We don't reset isSaving in finally block if successful 
    // because we are navigating away and don't want double taps during transition
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
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
          <Text style={[styles.headerTitle, { color: themeColors.text }]}>New Session</Text>
        </View>

        <View style={styles.form}>
          {/* Location */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Location</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
              onPress={() => setShowLocationModal(true)}
            >
              <Text style={[styles.selectButtonText, { color: location ? themeColors.text : themeColors.placeholder }]}>
                {location || 'Select Location'}
              </Text>
              <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
            </TouchableOpacity>
          </View>

          {/* Game Type */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Game Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.gameTypeScroll}>
              {GAME_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.gameTypeOption,
                    { backgroundColor: themeColors.inputBg, borderColor: themeColors.border },
                    gameType === type && styles.gameTypeOptionActive,
                  ]}
                  onPress={() => setGameType(type)}
                >
                  <Text style={[
                    styles.gameTypeText,
                    { color: themeColors.text },
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
            <Text style={[styles.label, { color: themeColors.text }]}>Blinds</Text>
            <View style={styles.row}>
              <View style={styles.halfInput}>
                <Text style={[styles.subLabel, { color: themeColors.subText }]}>Small</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  value={smallBlind}
                  onChangeText={setSmallBlind}
                  keyboardType="numeric"
                  placeholder="1"
                  placeholderTextColor={themeColors.placeholder}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.subLabel, { color: themeColors.subText }]}>Big</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  value={bigBlind}
                  onChangeText={setBigBlind}
                  keyboardType="numeric"
                  placeholder="2"
                  placeholderTextColor={themeColors.placeholder}
                />
              </View>
              <View style={styles.halfInput}>
                <Text style={[styles.subLabel, { color: themeColors.subText }]}>3rd (Opt)</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                  value={thirdBlind}
                  onChangeText={setThirdBlind}
                  keyboardType="numeric"
                  placeholder="-"
                  placeholderTextColor={themeColors.placeholder}
                />
              </View>
            </View>
          </View>

          {/* Ante & Buy-in */}
          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: themeColors.text }]}>Ante (Optional)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={ante}
                onChangeText={setAnte}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={[styles.label, { color: themeColors.text }]}>Buy-in</Text>
              <TextInput
                style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
                value={buyIn}
                onChangeText={setBuyIn}
                keyboardType="numeric"
                placeholder="100"
                placeholderTextColor={themeColors.placeholder}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
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
        <View style={[styles.modalOverlay, { backgroundColor: themeColors.modalOverlay }]}>
          <View style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Location</Text>
              <TouchableOpacity onPress={() => setShowLocationModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.addLocationContainer}>
              <TextInput
                style={[styles.addLocationInput, { backgroundColor: themeColors.modalInputBg, color: themeColors.text }]}
                value={newLocation}
                onChangeText={setNewLocation}
                placeholder="Add new location..."
                placeholderTextColor={themeColors.placeholder}
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
                  style={[styles.locationItem, { borderBottomColor: themeColors.border }]}
                  onPress={() => {
                    setLocation(item);
                    setShowLocationModal(false);
                  }}
                >
                  <Ionicons name="location-outline" size={20} color={themeColors.icon} />
                  <Text style={[styles.locationText, { color: themeColors.text }]}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={[styles.emptyText, { color: themeColors.subText }]}>No saved locations yet</Text>
              }
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}
