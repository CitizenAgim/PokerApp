import { StyleSheet } from 'react-native';
import { Colors } from '@/constants/theme';

export const getThemeColors = (isDark: boolean) => ({
  icon: isDark ? Colors.dark.icon : Colors.light.icon,
});

export const styles = StyleSheet.create({
  heading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  content: {
    marginTop: 6,
    marginLeft: 24,
  },
});
