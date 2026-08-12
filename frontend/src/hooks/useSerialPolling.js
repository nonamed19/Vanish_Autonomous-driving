import { useEffect, useRef } from "react";

/** Runs an async task immediately and never starts a second request before the first settles. */
export function useSerialPolling(task, intervalMs, enabled = true) {
  const taskRef = useRef(task);
  taskRef.current = task;

  useEffect(() => {
    if (!enabled) return undefined;

    let cancelled = false;
    let timerId;
    const run = async () => {
      try {
        await taskRef.current();
      } finally {
        if (!cancelled) timerId = window.setTimeout(run, intervalMs);
      }
    };

    run();
    return () => {
      cancelled = true;
      window.clearTimeout(timerId);
    };
  }, [enabled, intervalMs]);
}
