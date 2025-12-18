import { StyleSheet } from 'react-native';

export const getThemeColors = (isDark: boolean) => ({
  // ThemedText uses useThemeColor hook internally for the main text color,
  // but we can expose specific colors here if needed in the future.
  link: '#0a7ea4',
});

export const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
