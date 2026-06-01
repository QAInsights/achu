import { useEffect, useState, useRef } from 'react';

/**
 * Periodically polls a health check function to verify service connectivity.
 * Safe for test environments and handles dynamic check changes cleanly.
 *
 * @param checkFn - Async function returning a boolean representing server health.
 * @param pollTrigger - Variable that triggers an immediate recheck when changed (e.g. endpoint URI).
 * @param intervalMs - Polling interval in milliseconds. Defaults to 5000ms.
 */
export function useConnectionPoll(
  checkFn: () => Promise<boolean>,
  pollTrigger: any,
  intervalMs = 5000
) {
  const [isAvailable, setIsAvailable] = useState(false);
  const checkFnRef = useRef(checkFn);

  // Sync ref to avoid re-triggering the effect on every checkFn creation
  useEffect(() => {
    checkFnRef.current = checkFn;
  }, [checkFn]);

  useEffect(() => {
    if (process.env.NODE_ENV === 'test') return;

    let active = true;
    const check = async () => {
      try {
        const result = await checkFnRef.current();
        if (active) {
          setIsAvailable(result);
        }
      } catch {
        if (active) {
          setIsAvailable(false);
        }
      }
    };

    check();
    let interval: any = null;
    if (intervalMs > 0) {
      interval = setInterval(check, intervalMs);
    }

    return () => {
      active = false;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [pollTrigger, intervalMs]);

  return [isAvailable, setIsAvailable] as const;
}
