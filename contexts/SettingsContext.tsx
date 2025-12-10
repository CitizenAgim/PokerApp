import * as localStorage from '@/services/localStorage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

interface SettingsContextType {
  ninjaMode: boolean;
  loading: boolean;
  toggleNinjaMode: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [ninjaMode, setNinjaMode] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadSettings = useCallback(async () => {
    try {
      const prefs = await localStorage.getUserPreferences();
      setNinjaMode(prefs.ninjaMode);
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

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  return (
    <SettingsContext.Provider value={{ ninjaMode, loading, toggleNinjaMode }}>
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
