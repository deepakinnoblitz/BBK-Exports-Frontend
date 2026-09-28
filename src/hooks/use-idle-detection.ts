import { useRef, useState, useEffect, useCallback } from 'react';

// ----------------------------------------------------------------------

type Config = {
  onIdle: () => void;
  onActive: () => void;
  thresholdMs?: number;
  activityEvents?: string[];
};

export function useIdleDetection({ onIdle, onActive, thresholdMs = 60000, activityEvents }: Config) {
  const [isSystemMonitoring, setIsSystemMonitoring] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.floor(thresholdMs / 1000));
  const lastStatus = useRef<string | null>(null);
  const timeoutId = useRef<any>(null);
  const countdownIntervalId = useRef<any>(null);
  const idleDetector = useRef<any>(null);

  // Use refs for callbacks to avoid re-triggering effects when functions change
  const onIdleRef = useRef(onIdle);
  const onActiveRef = useRef(onActive);

  useEffect(() => {
    onIdleRef.current = onIdle;
    onActiveRef.current = onActive;
  }, [onIdle, onActive]);

  const startBreakRef = useRef<() => void>(() => {});
  const resetTimerRef = useRef<() => void>(() => {});

  const startBreak = useCallback(() => {
    if (lastStatus.current === 'idle') return;

    // 1. If system monitoring is active, verify that the system actually considers the user 'idle'
    // This prevents a local timer (e.g. 30s) from triggering a break if the system-wide detector
    // (min 60s) still sees activity elsewhere on the computer.
    if (idleDetector.current && idleDetector.current.userState === 'active') {
      console.log('[IdleDetection] Local timer reached but system is still active. Resetting.');
      resetTimerRef.current();
      return;
    }

    lastStatus.current = 'idle';
    setRemainingSeconds(0);
    onIdleRef.current();
  }, []);

  const endBreak = useCallback(() => {
    if (lastStatus.current === 'active') return;
    lastStatus.current = 'active';
    setRemainingSeconds(Math.floor(thresholdMs / 1000));
    onActiveRef.current();
  }, [thresholdMs]);

  const resetTimer = useCallback(() => {
    if (timeoutId.current) clearTimeout(timeoutId.current);
    if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);

    if (lastStatus.current === 'idle') {
      endBreak();
    }

    const totalSeconds = Math.floor(thresholdMs / 1000);
    setRemainingSeconds(totalSeconds);

    countdownIntervalId.current = setInterval(() => {
      setRemainingSeconds(prev => {
          const next = prev > 0 ? prev - 1 : 0;
          return next;
      });
    }, 1000);

    timeoutId.current = setTimeout(() => {
      if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
      startBreakRef.current();
    }, thresholdMs);
  }, [thresholdMs, endBreak]);

  // Sync refs
  useEffect(() => {
    startBreakRef.current = startBreak;
    resetTimerRef.current = resetTimer;
  }, [startBreak, resetTimer]);

  const requestSystemPermission = useCallback(async () => {
    if (!('IdleDetector' in window)) return 'unsupported';
    try {
      const permission = await (window as any).IdleDetector.requestPermission();
      if (permission === 'granted') {
        window.location.reload();
      }
      return permission;
    } catch (e) {
      console.error('Error requesting IdleDetector permission:', e);
      return 'error';
    }
  }, []);

  useEffect(() => {
    const events = activityEvents && activityEvents.length > 0
      ? activityEvents
      : ['mousemove', 'keydown', 'scroll', 'click', 'touchstart'];

    const initDetector = async () => {
      // Always set up event listeners for local reset (countdown sync)
      events.forEach(e => window.addEventListener(e, resetTimerRef.current));

      // 1. Try IdleDetector API (Chromium only)
      if ('IdleDetector' in window) {
        try {
          const permission = await (window.navigator as any).permissions.query({ name: 'idle-detection' });

          if (permission.state === 'granted') {
            const detector = new (window as any).IdleDetector();
            idleDetector.current = detector;

            await detector.start({
              // Minimum 60s for IdleDetector
              threshold: Math.max(thresholdMs, 60000),
            });

            detector.addEventListener('change', () => {
              const { userState, screenState } = detector;
              if (userState === 'idle' || screenState === 'locked') {
                startBreakRef.current();
              } else {
                // System became active! Reset our local timer and countdown.
                resetTimerRef.current();
              }
            });

            setIsSystemMonitoring(true);
          }
        } catch (error) {
          console.warn('[IdleDetection] System-wide start failed:', error);
        }
      }

      // Start the initial countdown
      resetTimerRef.current();
    };

    initDetector();

    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimerRef.current));
      if (timeoutId.current) clearTimeout(timeoutId.current);
      if (countdownIntervalId.current) clearInterval(countdownIntervalId.current);
      if (idleDetector.current) {
        try {
          idleDetector.current.abort();
        } catch (e) {
          // Ignore abort errors
        }
      }
    };
  }, [thresholdMs, activityEvents]);

  return { requestSystemPermission, isSystemMonitoring, remainingSeconds };
}
