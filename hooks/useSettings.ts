import { useSettingsContext } from '@/contexts/SettingsContext';

export interface UseSettingsResult {
  themeMode: 'system' | 'light' | 'dark';
  language: 'en';
  currency: 'EUR' | 'USD' | 'GBP';
  country: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  loading: boolean;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
  setLanguage: (lang: 'en') => Promise<void>;
  setCurrency: (currency: 'EUR' | 'USD' | 'GBP') => Promise<void>;
  setCountry: (country: string) => Promise<void>;
  setDateFormat: (format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD') => Promise<void>;
  setTimeFormat: (format: '12h' | '24h') => Promise<void>;
}

export function useSettings(): UseSettingsResult {
  return useSettingsContext();
}
