import { useCurrentSession, useSessions, useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import * as localStorage from '@/services/localStorage';
import { getThemeColors, styles } from '@/styles/sessions/new.styles';
import { normalizeLocation } from '@/utils/text';
import { Ionicons } from '@expo/vector-icons';
import { useHeaderHeight } from '@react-navigation/elements';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

const GAME_TYPES = ['Texas Holdem', 'PLO', 'PLO5', 'Short Deck'];
const CURRENCIES = ['USD', 'EUR', 'GBP'];

export default function NewSessionScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { createSession } = useSessions();
  const { startSession } = useCurrentSession();
  const { currency: defaultCurrency } = useSettings();
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
  const [selectedCurrency, setSelectedCurrency] = useState<string>(defaultCurrency);
  
  // Location Management
  const [locations, setLocations] = useState<string[]>([]);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [newLocation, setNewLocation] = useState('');
  
  const [saving, setSaving] = useState(false);
  const isSaving = useRef(false);

  useEffect(() => {
    loadLocations();
    loadLastConfig();
  }, []);

  // Update selected currency if default changes (and we haven't loaded a config yet)
  useEffect(() => {
    if (!location) { // Simple check to see if we've loaded config or started editing
        setSelectedCurrency(defaultCurrency);
    }
  }, [defaultCurrency]);

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
      if (config.currency) {
        setSelectedCurrency(config.currency);
      }
    }
  };

  const handleAddLocation = async () => {
    if (!newLocation.trim()) return;
    const loc = normalizeLocation(newLocation);
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
        ant,
        selectedCurrency
      );
      
      // Save config for next time
      await localStorage.saveLastSessionConfig({
        location,
        gameType,
        smallBlind,
        bigBlind,
        thirdBlind,
        ante,
        buyIn,
        currency: selectedCurrency
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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={[styles.container, { backgroundColor: themeColors.background }]}>
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={headerHeight}
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

          {/* Currency */}
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Currency</Text>
            <TouchableOpacity
              style={[styles.selectButton, { backgroundColor: themeColors.inputBg, borderColor: themeColors.border }]}
              onPress={() => setShowCurrencyModal(true)}
            >
              <Text style={[styles.selectButtonText, { color: themeColors.text }]}>
                {selectedCurrency}
              </Text>
              <Ionicons name="chevron-down" size={20} color={themeColors.icon} />
            </TouchableOpacity>
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
        </KeyboardAvoidingView>

        {/* Location Modal */}
      <Modal
        visible={showLocationModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowLocationModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { backgroundColor: themeColors.modalOverlay }]}
        >
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
              keyboardShouldPersistTaps="handled"
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
        </KeyboardAvoidingView>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={showCurrencyModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowCurrencyModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.modalOverlay, { backgroundColor: themeColors.modalOverlay }]}
        >
          <View style={[styles.modalContent, { backgroundColor: themeColors.modalBg }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: themeColors.text }]}>Select Currency</Text>
              <TouchableOpacity onPress={() => setShowCurrencyModal(false)}>
                <Ionicons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={CURRENCIES}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.locationItem, { borderBottomColor: themeColors.border }]}
                  onPress={() => {
                    setSelectedCurrency(item);
                    setShowCurrencyModal(false);
                  }}
                >
                  <Text style={[styles.locationText, { color: themeColors.text }]}>{item}</Text>
                  {selectedCurrency === item && <Ionicons name="checkmark" size={20} color="#0a7ea4" />}
                </TouchableOpacity>
              )}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}
