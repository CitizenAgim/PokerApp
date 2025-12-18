import * as localStorage from '@/services/localStorage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface SettingsContextType {
  ninjaMode: boolean;
  themeMode: 'system' | 'light' | 'dark';
  language: 'en';
  currency: 'EUR' | 'USD' | 'GBP';
  country: string;
  dateFormat: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  loading: boolean;
  toggleNinjaMode: () => Promise<void>;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
  setLanguage: (lang: 'en') => Promise<void>;
  setCurrency: (currency: 'EUR' | 'USD' | 'GBP') => Promise<void>;
  setCountry: (country: string) => Promise<void>;
  setDateFormat: (format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD') => Promise<void>;
  setTimeFormat: (format: '12h' | '24h') => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ninjaMode, setNinjaMode] = useState(false);
  const [themeMode, setThemeModeState] = useState<'system' | 'light' | 'dark'>('system');
  const [language, setLanguageState] = useState<'en'>('en');
  const [currency, setCurrencyState] = useState<'EUR' | 'USD' | 'GBP'>('USD');
  const [country, setCountryState] = useState('US');
  const [dateFormat, setDateFormatState] = useState<'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD'>('MM/DD/YYYY');
  const [timeFormat, setTimeFormatState] = useState<'12h' | '24h'>('12h');
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const prefs = await localStorage.getUserPreferences();
      setNinjaMode(prefs.ninjaMode);
      setThemeModeState(prefs.themeMode || 'system');
      setLanguageState(prefs.language || 'en');
      setCurrencyState(prefs.currency || 'USD');
      setCountryState(prefs.country || 'US');
      setDateFormatState(prefs.dateFormat || 'MM/DD/YYYY');
      setTimeFormatState(prefs.timeFormat || '12h');
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleNinjaMode = useCallback(async () => {
    try {
      const newValue = !ninjaMode;
      setNinjaMode(newValue);
      await localStorage.saveUserPreferences({ ninjaMode: newValue });
    } catch (error) {
      console.error('Failed to save settings:', error);
      // Revert on error
      setNinjaMode(prev => !prev);
    }
  }, [ninjaMode]);

  const setThemeMode = useCallback(async (mode: 'system' | 'light' | 'dark') => {
    try {
      setThemeModeState(mode);
      await localStorage.saveUserPreferences({ themeMode: mode });
    } catch (error) {
      console.error('Failed to save theme settings:', error);
    }
  }, []);

  const setLanguage = useCallback(async (lang: 'en') => {
    try {
      setLanguageState(lang);
      await localStorage.saveUserPreferences({ language: lang });
    } catch (error) {
      console.error('Failed to save language settings:', error);
    }
  }, []);

  const setCurrency = useCallback(async (curr: 'EUR' | 'USD' | 'GBP') => {
    try {
      setCurrencyState(curr);
      await localStorage.saveUserPreferences({ currency: curr });
    } catch (error) {
      console.error('Failed to save currency settings:', error);
    }
  }, []);

  const setCountry = useCallback(async (cntry: string) => {
    try {
      setCountryState(cntry);
      await localStorage.saveUserPreferences({ country: cntry });
    } catch (error) {
      console.error('Failed to save country settings:', error);
    }
  }, []);

  const setDateFormat = useCallback(async (format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD') => {
    try {
      setDateFormatState(format);
      await localStorage.saveUserPreferences({ dateFormat: format });
    } catch (error) {
      console.error('Failed to save date format settings:', error);
    }
  }, []);

  const setTimeFormat = useCallback(async (format: '12h' | '24h') => {
    try {
      setTimeFormatState(format);
      await localStorage.saveUserPreferences({ timeFormat: format });
    } catch (error) {
      console.error('Failed to save time format settings:', error);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <SettingsContext.Provider value={{ 
      ninjaMode, themeMode, language, currency, country, dateFormat, timeFormat, loading, 
      toggleNinjaMode, setThemeMode, setLanguage, setCurrency, setCountry, setDateFormat, setTimeFormat 
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}
