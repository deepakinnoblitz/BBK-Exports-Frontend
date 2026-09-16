import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';

import { getHRMSSettings } from 'src/api/settings';

// ----------------------------------------------------------------------

const SETTINGS_KEY = 'hrms_settings_cache';

type SettingsContextType = {
  settings: any;
  loading: boolean;
  refetch: () => Promise<any>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<any>(() => {
    const cached = localStorage.getItem(SETTINGS_KEY);
    return cached ? JSON.parse(cached) : null;
  });
  const [loading, setLoading] = useState(!settings);

  const fetchSettings = useCallback(async () => {
    if (window.location.pathname.includes('/sign-in')) {
      setLoading(false);
      return null;
    }
    try {
      const result = await getHRMSSettings();
      if (result) {
        setSettings(result);
        localStorage.setItem(SETTINGS_KEY, JSON.stringify(result));
        return result;
      }
    } catch (error) {
      console.error('Failed to fetch HRMS settings:', error);
    } finally {
      setLoading(false);
    }
    return null;
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const value = useMemo(
    () => ({
      settings,
      loading,
      refetch: fetchSettings,
    }),
    [settings, loading, fetchSettings]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettingsContext() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within a SettingsProvider');
  }
  return context;
}
