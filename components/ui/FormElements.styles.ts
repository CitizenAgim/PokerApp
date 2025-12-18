import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  label: isDark ? '#FFFFFF' : '#333',
  inputBg: isDark ? '#333333' : '#f5f5f5',
  inputBgFocused: isDark ? '#1c1c1e' : '#fff',
  inputBgError: isDark ? '#3a1c1c' : '#fef2f2',
  inputText: isDark ? '#FFFFFF' : '#333',
  placeholder: isDark ? '#666666' : '#999',
  icon: isDark ? '#AAAAAA' : '#888',
  borderFocused: '#0a7ea4',
  borderError: '#e74c3c',
  hint: isDark ? '#AAAAAA' : '#888',
  
  // Button colors
  btnPrimary: '#0a7ea4',
  btnSecondary: isDark ? '#333333' : '#f0f0f0',
  btnDanger: '#e74c3c',
  btnDisabled: isDark ? '#444444' : '#ccc',
  btnTextPrimary: '#fff',
  btnTextSecondary: isDark ? '#FFFFFF' : '#333',
  btnTextDisabled: isDark ? '#666666' : '#888',
});

export const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    // Dynamic color
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
    // Dynamic background and border
  },
  inputContainerFocused: {
    // Dynamic border and background
  },
  inputContainerError: {
    // Dynamic border and background
  },
  input: {
    flex: 1,
    padding: 14,
    fontSize: 16,
    // Dynamic color
  },
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  inputWithRightIcon: {
    paddingRight: 8,
  },
  leftIcon: {
    marginLeft: 14,
  },
  rightIconButton: {
    padding: 14,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  errorText: {
    fontSize: 12,
    // Dynamic color (usually fixed error color but can be dynamic)
  },
  hintText: {
    fontSize: 12,
    marginTop: 6,
    // Dynamic color
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    // Dynamic background
  },
  buttonGhost: {
    borderWidth: 1,
    // Dynamic border
  },
  buttonIcon: {
    marginRight: 8,
  },
  buttonText: {
    fontWeight: '600',
    // Dynamic color and font size
  },
});
