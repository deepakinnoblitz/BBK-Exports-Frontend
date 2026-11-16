import { useState, useEffect, useCallback } from 'react';

import { getAppBranding, getHRMSSettings } from 'src/api/settings';

import { useOptionalSettingsContext } from './settings-context';

export function useHRMSSettings() {
    const context = useOptionalSettingsContext();
    const [fallbackSettings, setFallbackSettings] = useState<any>(null);
    const [fallbackLoading, setFallbackLoading] = useState(!context);

    const fetchFallback = useCallback(async () => {
        setFallbackLoading(true);
        try {
            const isSignInPage = window.location.pathname.includes('/sign-in');
            const result = isSignInPage ? await getAppBranding() : await getHRMSSettings();
            if (result) {
                setFallbackSettings(result);
                return result;
            }
        } catch (error) {
            console.error('Failed to fetch HRMS settings:', error);
        } finally {
            setFallbackLoading(false);
        }
        return null;
    }, []);

    useEffect(() => {
        if (!context) {
            fetchFallback();
        }
    }, [context, fetchFallback]);

    if (context) {
        return context;
    }

    return {
        settings: fallbackSettings,
        loading: fallbackLoading,
        refetch: fetchFallback,
    };
}

