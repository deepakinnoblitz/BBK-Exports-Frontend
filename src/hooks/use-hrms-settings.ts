import { useState, useEffect, useCallback } from 'react';

import { getHRMSSettings } from 'src/api/settings';

const SETTINGS_KEY = 'hrms_settings_cache';

export function useHRMSSettings() {
    const [settings, setSettings] = useState<any>(() => {
        const cached = localStorage.getItem(SETTINGS_KEY);
        return cached ? JSON.parse(cached) : null;
    });
    const [loading, setLoading] = useState(!settings);

    const fetchSettings = useCallback(async () => {
        if (window.location.pathname.includes('/sign-in')) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const result = await getHRMSSettings();
            if (result) {
                setSettings(result);
                localStorage.setItem(SETTINGS_KEY, JSON.stringify(result));
            }
        } catch (error) {
            console.error('Failed to fetch HRMS settings:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    return { settings, loading, refetch: fetchSettings };
}

