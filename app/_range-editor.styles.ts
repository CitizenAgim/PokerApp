import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  background: isDark ? '#000' : '#FFFFFF',
  text: isDark ? '#fff' : '#333',
  subText: isDark ? '#aaa' : '#666',
  border: isDark ? '#333' : '#E0E0E0',
  card: isDark ? '#1c1c1e' : '#F5F5F5',
  instructionBg: isDark ? '#1c1c1e' : '#F5F5F5',
  primary: '#0a7ea4',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 16,
    color: '#0a7ea4',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 8,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0a7ea4',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  playerHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  playerName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  gridContainer: {
    alignItems: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#FF5722',
    borderRadius: 8,
  },
  clearButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  instructions: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    gap: 4,
  },
  instructionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  instructionText: {
    fontSize: 13,
    color: '#666',
  },
});
