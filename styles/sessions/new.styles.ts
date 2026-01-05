import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  background: isDark ? '#000' : '#f5f5f5',
  card: isDark ? '#1c1c1e' : '#fff',
  text: isDark ? '#fff' : '#333',
  subText: isDark ? '#aaa' : '#666',
  border: isDark ? '#333' : '#e0e0e0',
  inputBg: isDark ? '#1c1c1e' : '#fff',
  placeholder: isDark ? '#666' : '#999',
  modalOverlay: 'rgba(0,0,0,0.5)',
  modalBg: isDark ? '#1c1c1e' : '#fff',
  modalInputBg: isDark ? '#2c2c2e' : '#f5f5f5',
  icon: isDark ? '#aaa' : '#666',
});

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardAvoidingView: {
    flex: 1,
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
