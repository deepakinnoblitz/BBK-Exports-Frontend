import { useRef, useState, useEffect, useCallback } from 'react';

import { getPresence, logLocation, pingPresence, checkTodayTimesheet, getPresenceSettings, updatePresence as apiUpdatePresence } from 'src/api/presence';

import { useAuth } from 'src/auth/auth-context';

import { useSocket } from './use-socket';
import { useIdleDetection } from './use-idle-detection';

const requestCurrentLocation = (): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(
        new Error(
          'Geolocation is not supported by your browser.'
        )
      );
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve(position);
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            reject(
              new Error(
                'Location permission is denied. Please enable location access to continue.'
              )
            );
            break;

          case error.POSITION_UNAVAILABLE:
            reject(
              new Error(
                'Unable to determine your current location. Please make sure Location Services are enabled.'
              )
            );
            break;

          case error.TIMEOUT:
            reject(
              new Error(
                'Location request timed out. Please try again.'
              )
            );
            break;

          default:
            reject(
              new Error(
                'Unable to access your location. Please try again.'
              )
            );
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  });

// ── Module-level singleton for Auto Location Tracking ──
// usePresence() is mounted in multiple components simultaneously.
// Without this guard, each instance would create its own setInterval,
// causing duplicate location logs per tracking cycle.
let _autoTrackInterval: ReturnType<typeof setInterval> | undefined;
let _autoTrackEmployeeId: string | null = null;

function clearAutoTrackInterval() {
  if (_autoTrackInterval) {
    clearInterval(_autoTrackInterval);
    _autoTrackInterval = undefined;
    _autoTrackEmployeeId = null;
  }
}

export function usePresence() {
  const { user } = useAuth();
  const { socket } = useSocket(user?.email);
  const [status, setStatus] = useState<string>('Offline');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [session, setSession] = useState<any>(null);
  const [activeBreak, setActiveBreak] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAutoStatusEnabled, setIsAutoStatusEnabled] = useState(false);
  const [idleThreshold, setIdleThreshold] = useState(60);
  const [awayThreshold, setAwayThreshold] = useState(300);
  const [breakThreshold, setBreakThreshold] = useState(900);
  const [enableAutoResumeBreak, setEnableAutoResumeBreak] = useState(true);
  const [activityEvents, setActivityEvents] = useState(['mousemove', 'keydown', 'scroll', 'click', 'touchstart']);

  // Geo Location tracking settings
  const [enableLocationTracking, setEnableLocationTracking] = useState(false);
  const [trackOnLogin, setTrackOnLogin] = useState(false);
  const [trackOnLogout, setTrackOnLogout] = useState(false);
  const [trackOnStatusChange, setTrackOnStatusChange] = useState(false);
  const [trackingIntervalMinutes, setTrackingIntervalMinutes] = useState(10);
  const [minimumGpsAccuracy, setMinimumGpsAccuracy] = useState(100);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);

  const prevStatusBeforeIdle = useRef<string | null>(null);
  const idleAtRef = useRef<Date | null>(null);

  // Refs for tracking properties to prevent stale closures
  const enableLocationTrackingRef = useRef(enableLocationTracking);
  const trackOnLoginRef = useRef(trackOnLogin);
  const trackOnLogoutRef = useRef(trackOnLogout);
  const trackOnStatusChangeRef = useRef(trackOnStatusChange);
  const trackingIntervalMinutesRef = useRef(trackingIntervalMinutes);
  const minimumGpsAccuracyRef = useRef(minimumGpsAccuracy);

  useEffect(() => {
    enableLocationTrackingRef.current = enableLocationTracking;
    trackOnLoginRef.current = trackOnLogin;
    trackOnLogoutRef.current = trackOnLogout;
    trackOnStatusChangeRef.current = trackOnStatusChange;
    trackingIntervalMinutesRef.current = trackingIntervalMinutes;
    minimumGpsAccuracyRef.current = minimumGpsAccuracy;
  }, [enableLocationTracking, trackOnLogin, trackOnLogout, trackOnStatusChange, trackingIntervalMinutes, minimumGpsAccuracy]);

  const employeeId = (user as any)?.employee;

  const logLocationIfAllowed = useCallback(async (source: 'Login' | 'Logout' | 'Status Change' | 'Auto Tracking', currentStatus: string) => {
    if (!enableLocationTrackingRef.current) return;

    // Check specific conditions
    if (source === 'Login' && !trackOnLoginRef.current) return;
    if (source === 'Logout' && !trackOnLogoutRef.current) return;
    if (source === 'Status Change' && !trackOnStatusChangeRef.current) return;

    try {
      const position = await requestCurrentLocation();
      const { latitude, longitude, accuracy } = position.coords;

      // Call api
      await logLocation(latitude, longitude, accuracy, currentStatus, source);
      console.log(`[Location Tracking] Location logged successfully for source: ${source}`);
    } catch (err) {
      console.error('[Location Tracking] Failed to log location:', err);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!employeeId) return;
    try {
      const data = await getPresence(employeeId);
      if (data) {
        const newStatus = data.presence?.status || 'Offline';
        setStatus(newStatus);
        setStatusMessage(data.presence?.status_message || '');
        setSession(data.session);
        setActiveBreak(data.break);
        localStorage.setItem('user_presence_status', newStatus);
      }
    } catch (error) {
      console.error('Error fetching presence:', error);
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  const fetchSettings = useCallback(async () => {
    try {
      const settings = await getPresenceSettings();
      setIsAutoStatusEnabled(!!settings.enable_auto_status);
      setIdleThreshold(settings.idle_threshold || 60);
      setAwayThreshold(settings.away_threshold || 300);
      setBreakThreshold(settings.break_threshold || 900);
      setEnableAutoResumeBreak(!!settings.enable_auto_resume_break);

      const target = settings.location_tracking_target || 'All Employees';
      const isEmployeeTracked = target === 'All Employees' || 
        (target === 'Selected Employees' && Array.isArray(settings.tracked_employees) && !!employeeId && settings.tracked_employees.includes(employeeId));

      setEnableLocationTracking(!!settings.enable_location_tracking && isEmployeeTracked);
      setTrackOnLogin(!!settings.track_on_login);
      setTrackOnLogout(!!settings.track_on_logout);
      setTrackOnStatusChange(!!settings.track_on_status_change);
      setTrackingIntervalMinutes(settings.tracking_interval_minutes || 10);
      setMinimumGpsAccuracy(settings.minimum_gps_accuracy || 100);

      const events = [];
      if (settings.event_mousemove) events.push('mousemove');
      if (settings.event_keydown) events.push('keydown');
      if (settings.event_scroll) events.push('scroll');
      if (settings.event_click) events.push('click');
      if (settings.event_touchstart) events.push('touchstart');
      setActivityEvents(events.length > 0 ? events : ['mousemove', 'keydown', 'scroll', 'click', 'touchstart']);
    } catch (error) {
      console.error('Error fetching presence settings:', error);
    }
  }, []);

  // Socket listener for global settings
  useEffect(() => {
    if (socket) {
      const handleSettingsUpdate = (data: any) => {
        if (data && data.enable_auto_status !== undefined) {
          setIsAutoStatusEnabled(!!data.enable_auto_status);
        }
        if (data && data.idle_threshold !== undefined) {
          setIdleThreshold(data.idle_threshold);
        }
        if (data && data.away_threshold !== undefined) {
          setAwayThreshold(data.away_threshold);
        }
        if (data && data.break_threshold !== undefined) {
          setBreakThreshold(data.break_threshold);
        }
        if (data && data.enable_auto_resume_break !== undefined) {
          setEnableAutoResumeBreak(!!data.enable_auto_resume_break);
        }
        if (data && data.enable_location_tracking !== undefined) {
          setEnableLocationTracking(!!data.enable_location_tracking);
        }
        if (data && data.track_on_login !== undefined) {
          setTrackOnLogin(!!data.track_on_login);
        }
        if (data && data.track_on_logout !== undefined) {
          setTrackOnLogout(!!data.track_on_logout);
        }
        if (data && data.track_on_status_change !== undefined) {
          setTrackOnStatusChange(!!data.track_on_status_change);
        }
        if (data && data.tracking_interval_minutes !== undefined) {
          setTrackingIntervalMinutes(data.tracking_interval_minutes);
        }
        if (data && data.minimum_gps_accuracy !== undefined) {
          setMinimumGpsAccuracy(data.minimum_gps_accuracy);
        }

        const events = [];
        if (data.event_mousemove !== undefined) {
          if (data.event_mousemove) events.push('mousemove');
          if (data.event_keydown) events.push('keydown');
          if (data.event_scroll) events.push('scroll');
          if (data.event_click) events.push('click');
          if (data.event_touchstart) events.push('touchstart');
          if (events.length > 0) setActivityEvents(events);
        }
      };

      socket.on('presence_settings_update', handleSettingsUpdate);
      return () => {
        socket.off('presence_settings_update', handleSettingsUpdate);
      };
    }

    return undefined;
  }, [socket]);

  const validateLocationForStatusChange = useCallback(async () => {
    if (!enableLocationTrackingRef.current) {
      return true;
    }

    if (!trackOnStatusChangeRef.current) {
      return true;
    }

    try {
      const position = await requestCurrentLocation();

      if (!position?.coords) {
        throw new Error("Unable to get location");
      }

      return true;
    } catch (err: any) {
      console.error(err);

      setLocationDialogOpen(true);
      return false;
    }
  }, []);

  const changeStatus = async (newStatus: string, message?: string, source: string = 'Manual', startTime?: string): Promise<boolean> => {
    if (!employeeId) return false;
    try {
      // Validate GPS before status change
      if (newStatus !== 'Offline') {
        const canProceed = await validateLocationForStatusChange();

        if (!canProceed) {
          // GPS unavailable or permission denied
          // Dialog is already opened inside validateLocationForStatusChange()
          return false;
        }
      } else {
        // If logging out, check if location tracking is enabled for logout
        if (enableLocationTrackingRef.current && trackOnLogoutRef.current) {
          try {
            const position = await requestCurrentLocation();
            const { latitude, longitude, accuracy } = position.coords;
            // Log location first
            await logLocation(latitude, longitude, accuracy, newStatus, 'Logout');
          } catch (err) {
            console.error('Location logging failed during logout:', err);
            setLocationDialogOpen(true);
            return false;
          }
        }
      }

      const res = await apiUpdatePresence(newStatus, employeeId, message, source, startTime);
      if (res.status === 'success') {
        const oldStatus = status;
        setStatus(newStatus);
        setStatusMessage(res.status_message || message || '');
        fetchStatus();

        // Trigger chat unread count refresh if status changed to Available
        if (newStatus === 'Available') {
          window.dispatchEvent(new Event('REFRESH_CHAT_UNREAD_COUNT'));
        }

        // Trigger Geo Location Tracking for non-Offline status changes
        if (newStatus !== 'Offline') {
          let trackingSource: 'Login' | 'Logout' | 'Status Change' = 'Status Change';
          if (oldStatus === 'Offline') {
            trackingSource = 'Login';
            await logLocationIfAllowed(trackingSource, newStatus);
          } else {
            trackingSource = 'Status Change';
            await logLocationIfAllowed(trackingSource, newStatus);
          }
        }
      }
      localStorage.setItem('user_presence_status', newStatus);
      return true;
    } catch (error) {
      console.error('Error updating presence:', error);
      return false;
    }
  };

  const setCustomMessage = async (message: string) => {
    if (!employeeId) return;
    try {
      const res = await apiUpdatePresence(status, employeeId, message);
      if (res.status === 'success' || res.status === 'No change') {
        setStatusMessage(message);
      }
    } catch (error) {
      console.error('Error setting status message:', error);
    }
  };

  const checkTimesheet = async () => {
    if (!employeeId) return { has_timesheet: false };
    try {
      const res = await checkTodayTimesheet(employeeId);
      return res;
    } catch (error) {
      console.error('Error checking timesheet:', error);
      return { has_timesheet: false };
    }
  };

  const statusRef = useRef(status);
  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  // ── Auto Status Detection ──
  const awayTimerRef = useRef<any>(null);
  const breakTimerRef = useRef<any>(null);

  // changeStatusRef: stable ref to avoid stale closures inside timers
  const changeStatusRef = useRef(changeStatus);
  useEffect(() => {
    changeStatusRef.current = changeStatus;
  });

  // Stable refs for threshold values inside timers (avoids stale closures)
  const awayThresholdRef = useRef(awayThreshold);
  const breakThresholdRef = useRef(breakThreshold);
  const idleThresholdRef = useRef(idleThreshold);
  const isAutoStatusEnabledRef = useRef(isAutoStatusEnabled);
  useEffect(() => {
    awayThresholdRef.current = awayThreshold;
    breakThresholdRef.current = breakThreshold;
    idleThresholdRef.current = idleThreshold;
    isAutoStatusEnabledRef.current = isAutoStatusEnabled;
  }, [awayThreshold, breakThreshold, idleThreshold, isAutoStatusEnabled]);

  const { requestSystemPermission, isSystemMonitoring, remainingSeconds } = useIdleDetection({
    onIdle: () => {
      if (!isAutoStatusEnabledRef.current) return;

      console.log(`[Presence] System is now Idle (> ${idleThresholdRef.current}s)`);

      // Record when the user actually went idle (back-calculate past the idle threshold)
      const now = new Date();
      idleAtRef.current = new Date(now.getTime() - idleThresholdRef.current * 1000);

      if (statusRef.current !== 'Available') return;

      // ── Stage 1: Schedule Away ──
      const timeToAwayMs = Math.max(0, (awayThresholdRef.current - idleThresholdRef.current) * 1000);
      if (awayTimerRef.current) clearTimeout(awayTimerRef.current);

      awayTimerRef.current = setTimeout(async () => {
        if (statusRef.current !== 'Available') return;
        console.log(`[Presence] Switching to Away.`);
        prevStatusBeforeIdle.current = 'Available';
        const capturedIdleAt = idleAtRef.current?.toISOString();
        await changeStatusRef.current('Away', 'Auto-away due to inactivity', 'Idle', capturedIdleAt);

        // ── Stage 2: Schedule Break (set AFTER Away confirmed) ──
        if (breakTimerRef.current) clearTimeout(breakTimerRef.current);
        const timeToBreakMs = Math.max(0, (breakThresholdRef.current - awayThresholdRef.current) * 1000);

        breakTimerRef.current = setTimeout(() => {
          if (statusRef.current !== 'Away') return;
          console.log(`[Presence] Away too long — switching to Break. idleAt=${capturedIdleAt}`);
          changeStatusRef.current('Break', 'Auto-transition from Away to Break', 'Idle', capturedIdleAt);
          breakTimerRef.current = null;
        }, timeToBreakMs);

      }, timeToAwayMs);
    },
    onActive: () => {
      // Clear both pending timers
      if (awayTimerRef.current) { clearTimeout(awayTimerRef.current); awayTimerRef.current = null; }
      if (breakTimerRef.current) { clearTimeout(breakTimerRef.current); breakTimerRef.current = null; }

      if (!isAutoStatusEnabledRef.current) return;

      if (statusRef.current === 'Away') {
        console.log('[Presence] Activity detected: Resuming from Away');
        changeStatusRef.current('Available', 'Auto-resumed from Away', 'Idle');
        idleAtRef.current = null;
      } else if (statusRef.current === 'Break' && enableAutoResumeBreak) {
        console.log('[Presence] Activity detected: Resuming from Break');
        changeStatusRef.current('Available', 'Auto-resumed from Break', 'Idle');
        idleAtRef.current = null;
      }
    },
    thresholdMs: idleThreshold * 1000,
    activityEvents,
  });

  // Secondary Resume Trigger: When user returns to the tab
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStatus();
        if (isAutoStatusEnabled) {
          if (statusRef.current === 'Away') {
            console.log('[Presence] Tab became visible: Resuming from Away');
            changeStatus('Available', 'Auto-resumed upon returning to tab', 'Idle');
          } else if (statusRef.current === 'Break' && enableAutoResumeBreak) {
            console.log('[Presence] Tab became visible: Resuming from Break');
            changeStatus('Available', 'Auto-resumed upon returning to tab', 'Idle');
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fetchStatus, isAutoStatusEnabled]);

  // Initial fetch
  useEffect(() => {
    fetchStatus();
    fetchSettings();
  }, [fetchStatus, fetchSettings]);

  // Periodic ping (every 120 seconds) - Increased frequency for auto-status accuracy
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (status !== 'Offline' && !loading && employeeId) {
      interval = setInterval(async () => {
        await pingPresence(employeeId);
      }, 120000); // 120s
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [status, loading, employeeId]);

  // Periodic Auto Location Tracking (singleton — only ONE interval runs across all hook instances)
  useEffect(() => {
    const shouldTrack = status !== 'Offline' && !loading && employeeId && enableLocationTracking;

    if (shouldTrack) {
      // Only recreate the interval if the employee changed or none exists yet
      if (_autoTrackEmployeeId !== employeeId || !_autoTrackInterval) {
        clearAutoTrackInterval();
        _autoTrackEmployeeId = employeeId;
        _autoTrackInterval = setInterval(() => {
          logLocationIfAllowed('Auto Tracking', statusRef.current);
        }, trackingIntervalMinutes * 60 * 1000);
      }
    } else {
      // Clear if we go offline or tracking is disabled
      if (_autoTrackEmployeeId === employeeId) {
        clearAutoTrackInterval();
      }
    }

    // No cleanup here — the singleton is intentionally shared across instances.
    // It gets cleared when any instance detects Offline/disabled tracking.
  }, [status, loading, employeeId, enableLocationTracking, trackingIntervalMinutes, logLocationIfAllowed]);

  return {
    status,
    statusMessage,
    session,
    activeBreak,
    loading,
    isAutoStatusEnabled,
    isSystemMonitoring,
    remainingSeconds,
    changeStatus,
    setCustomMessage,
    checkTimesheet,
    requestSystemPermission,
    refresh: fetchStatus,
    logLocationIfAllowed,
    locationDialogOpen,
    setLocationDialogOpen,
    enableLocationTracking,
    trackOnLogin,
    trackOnLogout,
    trackOnStatusChange,
  };
}
