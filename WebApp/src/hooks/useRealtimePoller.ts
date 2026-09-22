import { useEffect, useRef } from 'react';

/**
 * Event name for global status mutations in WebApp
 */
export const STATUS_CHANGE_EVENT = 'triptual:status-change';

/**
 * Dispatches a global event indicating database status has changed
 */
export const triggerStatusRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STATUS_CHANGE_EVENT));
  }
};

interface UseRealtimePollerOptions {
  enabled?: boolean;
  intervalMs?: number;
  listenToWindowFocus?: boolean;
  listenToEvents?: boolean;
}

/**
 * Hook to keep component state in sync with real-time database changes.
 * Features:
 * 1. Active interval background polling (default 3000ms)
 * 2. Instant sync when browser window/tab gains focus or becomes visible
 * 3. Instant sync on custom status change events
 */
export function useRealtimePoller(
  callback: () => void | Promise<void>,
  options: UseRealtimePollerOptions = {}
) {
  const {
    enabled = true,
    intervalMs = 3000,
    listenToWindowFocus = true,
    listenToEvents = true,
  } = options;

  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled) return;

    // Helper to safely execute callback
    const executeCallback = () => {
      try {
        const result = callbackRef.current();
        if (result && typeof result.then === 'function') {
          result.catch((err) => console.warn('Realtime poller execution error:', err));
        }
      } catch (err) {
        console.warn('Realtime poller error:', err);
      }
    };

    // 1. Set up periodic polling interval
    const timerId = setInterval(executeCallback, intervalMs);

    // 2. Set up window focus & tab visibility listener
    const handleFocusOrVisibility = () => {
      if (document.visibilityState === 'visible') {
        executeCallback();
      }
    };

    if (listenToWindowFocus && typeof window !== 'undefined') {
      window.addEventListener('focus', handleFocusOrVisibility);
      document.addEventListener('visibilitychange', handleFocusOrVisibility);
    }

    // 3. Set up custom status event listener
    const handleCustomEvent = () => {
      executeCallback();
    };

    if (listenToEvents && typeof window !== 'undefined') {
      window.addEventListener(STATUS_CHANGE_EVENT, handleCustomEvent);
    }

    return () => {
      clearInterval(timerId);
      if (listenToWindowFocus && typeof window !== 'undefined') {
        window.removeEventListener('focus', handleFocusOrVisibility);
        document.removeEventListener('visibilitychange', handleFocusOrVisibility);
      }
      if (listenToEvents && typeof window !== 'undefined') {
        window.removeEventListener(STATUS_CHANGE_EVENT, handleCustomEvent);
      }
    };
  }, [enabled, intervalMs, listenToWindowFocus, listenToEvents]);
}
