import { usePlayers } from '@/hooks';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { resizeImage } from '@/utils/image';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
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

export default function NewPlayerScreen() {
  const router = useRouter();
  const { createPlayer } = usePlayers();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Theme colors
  const themeColors = {
    background: isDark ? '#000' : '#f5f5f5',
    card: isDark ? '#1c1c1e' : '#fff',
    text: isDark ? '#fff' : '#333',
    subText: isDark ? '#aaa' : '#888',
    border: isDark ? '#333' : '#e0e0e0',
    inputBg: isDark ? '#1c1c1e' : '#fff',
    placeholder: isDark ? '#666' : '#999',
    tipsBg: isDark ? '#1a2a3a' : '#e3f2fd',
    tipsText: isDark ? '#64b5f6' : '#1976d2',
    tipsTitle: isDark ? '#64b5f6' : '#0a7ea4',
  };
  
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const resizedUri = await resizeImage(result.assets[0].uri);
      setPhotoUrl(resizedUri);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a player name');
      return;
    }

    try {
      setSaving(true);
      await createPlayer({
        name: name.trim(),
        notes: notes.trim() || undefined,
        photoUrl,
      });
      router.back();
    } catch (error) {
      Alert.alert('Error', 'Failed to create player');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Avatar Preview */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handlePickImage}>
            {photoUrl ? (
              <Image source={{ uri: photoUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {name ? name.charAt(0).toUpperCase() : '?'}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.photoButton} onPress={handlePickImage}>
            <Ionicons name="camera" size={20} color="#0a7ea4" />
            <Text style={styles.photoButtonText}>{photoUrl ? 'Change Photo' : 'Add Photo'}</Text>
          </TouchableOpacity>
        </View>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Name *</Text>
            <TextInput
              style={[styles.input, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
              value={name}
              onChangeText={setName}
              placeholder="Enter player name"
              placeholderTextColor={themeColors.placeholder}
              autoFocus
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: themeColors.text }]}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea, { backgroundColor: themeColors.inputBg, color: themeColors.text, borderColor: themeColors.border }]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add notes about this player's tendencies..."
              placeholderTextColor={themeColors.placeholder}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Tips */}
        <View style={[styles.tips, { backgroundColor: themeColors.tipsBg }]}>
          <Text style={[styles.tipsTitle, { color: themeColors.tipsTitle }]}>Tips</Text>
          <Text style={[styles.tipsText, { color: themeColors.tipsText }]}>
            • Use nicknames or identifiers you'll remember
          </Text>
          <Text style={[styles.tipsText, { color: themeColors.tipsText }]}>
            • Add notes about their playing style
          </Text>
          <Text style={[styles.tipsText, { color: themeColors.tipsText }]}>
            • You can edit ranges after creating the player
          </Text>
        </View>
      </ScrollView>

      {/* Save Button */}
      <View style={[styles.footer, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.saveButton, !name.trim() && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving || !name.trim()}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Create Player</Text>
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
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0a7ea4',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 40,
    fontWeight: '700',
    color: '#fff',
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  photoButtonText: {
    color: '#0a7ea4',
    fontWeight: '500',
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
  textArea: {
    minHeight: 100,
  },
  tips: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0a7ea4',
    marginBottom: 8,
  },
  tipsText: {
    fontSize: 13,
    color: '#1976d2',
    marginBottom: 4,
  },
  footer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a7ea4',
    padding: 16,
    borderRadius: 10,
    gap: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
