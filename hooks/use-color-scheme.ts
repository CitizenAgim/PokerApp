import { useSettingsContext } from '@/contexts/SettingsContext';
import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme() {
  const nativeColorScheme = useNativeColorScheme();
  
  try {
    const { themeMode } = useSettingsContext();
    
    if (themeMode === 'dark') return 'dark';
    if (themeMode === 'light') return 'light';
    return nativeColorScheme;
  } catch (e) {
    // Fallback if used outside provider
    return nativeColorScheme;
  }
}
