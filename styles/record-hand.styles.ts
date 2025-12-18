import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  background: isDark ? '#000' : '#f5f5f5',
  card: isDark ? '#1c1c1e' : '#fff',
  text: isDark ? '#fff' : '#333',
  subText: isDark ? '#aaa' : '#666',
  border: isDark ? '#333' : '#e0e0e0',
  inputBg: isDark ? '#2c2c2e' : '#f5f5f5',
  placeholder: isDark ? '#666' : '#999',
  actionButtonBg: isDark ? '#1a2a3a' : '#f0f9ff',
  icon: isDark ? '#aaa' : '#666',
  seatBg: isDark ? '#2c2c2e' : '#fff',
  seatBorder: isDark ? '#444' : '#ddd',
  seatOccupiedBg: isDark ? '#1a2a3a' : '#e3f2fd',
  seatOccupiedBorder: isDark ? '#0d47a1' : '#2196f3',
  seatHeroBg: isDark ? '#3a2a1a' : '#fff3e0',
  seatHeroBorder: isDark ? '#e65100' : '#ff9800',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 16,
    color: '#0a7ea4',
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  controls: {
    padding: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  col: {
    flex: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 10,
    gap: 8,
    marginBottom: 12,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
});
