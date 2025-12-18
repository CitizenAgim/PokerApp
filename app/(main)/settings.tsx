import { useSettings } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { haptics } from '@/utils/haptics';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { 
    ninjaMode, toggleNinjaMode, 
    themeMode, setThemeMode,
    language, setLanguage,
    currency, setCurrency,
    country, setCountry,
    dateFormat, setDateFormat,
    timeFormat, setTimeFormat
  } = useSettings();

  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showDateFormatModal, setShowDateFormatModal] = useState(false);

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
  };

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
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: themeColors.text }]}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>
      
      <ScrollView style={styles.content}>
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

        {/* Appearance */}
        {renderSectionHeader('APPEARANCE')}
        
        <View style={[styles.settingItem, { backgroundColor: themeColors.card }]}>
          <View style={[styles.settingIcon, { backgroundColor: themeColors.settingIconBg }]}>
            <Ionicons name={ninjaMode ? "eye-off-outline" : "eye-outline"} size={22} color={themeColors.icon} />
          </View>
          <View style={styles.settingContent}>
            <Text style={[styles.settingText, { color: themeColors.text }]}>Hide Pictures (Ninja Mode)</Text>
          </View>
          <Switch
            value={ninjaMode}
            onValueChange={() => {
              haptics.lightTap();
              toggleNinjaMode();
            }}
            trackColor={{ false: isDark ? '#333' : '#e0e0e0', true: '#81c784' }}
            thumbColor={ninjaMode ? '#27ae60' : '#f5f5f5'}
          />
        </View>

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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
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
});
