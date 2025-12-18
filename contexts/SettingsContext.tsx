import * as localStorage from '@/services/localStorage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface SettingsContextType {
  ninjaMode: boolean;
  themeMode: 'system' | 'light' | 'dark';
  loading: boolean;
  toggleNinjaMode: () => Promise<void>;
  setThemeMode: (mode: 'system' | 'light' | 'dark') => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ninjaMode, setNinjaMode] = useState(false);
  const [themeMode, setThemeModeState] = useState<'system' | 'light' | 'dark'>('system');
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const prefs = await localStorage.getUserPreferences();
      setNinjaMode(prefs.ninjaMode);
      setThemeModeState(prefs.themeMode || 'system');
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

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <SettingsContext.Provider value={{ ninjaMode, themeMode, loading, toggleNinjaMode, setThemeMode }}>
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
