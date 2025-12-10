import { useSettingsContext } from '@/contexts/SettingsContext';

export interface UseSettingsResult {
  ninjaMode: boolean;
  loading: boolean;
  toggleNinjaMode: () => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  return useSettingsContext();
}
