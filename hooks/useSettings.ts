import { useSettingsContext } from '@/contexts/SettingsContext';

export interface UseSettingsResult {
  ninjaMode: boolean;
  themeMode: 'system' | 'light' | 'dark';
  loading: boolean;
  toggleNinjaMode: () => Promise<void>;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  return useSettingsContext();
}
