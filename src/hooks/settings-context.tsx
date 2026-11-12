import type { ReactNode } from 'react';

import { useMemo, useState, useEffect, useContext, useCallback, createContext } from 'react';

import { getAppBranding, getHRMSSettings } from 'src/api/settings';

// ----------------------------------------------------------------------

const SETTINGS_KEY = 'hrms_settings_cache';

type SettingsContextType = {
  settings: any;
  loading: boolean;
  refetch: () => Promise<any>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

function readCachedSettings(): any {
  try {
    const cached = localStorage.getItem(SETTINGS_KEY);
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<any>(() => readCachedSettings());
  const [loading, setLoading] = useState(!settings);

  const fetchSettings = useCallback(async () => {
    try {
      const isSignInPage = window.location.pathname.includes('/sign-in');
      if (isSignInPage) {
        const branding = await getAppBranding();
        if (branding) {
          setSettings((prev: any) => {
            const merged = { ...(prev || {}), ...branding };
            try {
              localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
            } catch {
              // ignore storage errors
            }
            return merged;
          });
          return branding;
        }
        return null;
      }

      const result = await getHRMSSettings();
      if (result) {
        setSettings(result);
        try {
          localStorage.setItem(SETTINGS_KEY, JSON.stringify(result));
        } catch {
          // ignore storage errors
        }
        return result;
      }

      const branding = await getAppBranding();
      if (branding) {
        setSettings((prev: any) => ({ ...(prev || {}), ...branding }));
        return branding;
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

export function useOptionalSettingsContext() {
  return useContext(SettingsContext);
}
