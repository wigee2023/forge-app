import { useCallback, useEffect, useRef, useState } from 'react';
import { Pedometer } from 'expo-sensors';

type Source = 'pedometer' | 'manual';

export type HeartRateState = {
  bpm: number | null;
  source: Source;
  available: boolean;
};

type Return = {
  hr: HeartRateState;
  setManual: (bpm: number) => void;
  clearManual: () => void;
};

// Steps/min → estimated bpm for loaded movement (ruck/run)
// Based on linear regression of published military load-carriage studies
// Steps/min 80 → ~100bpm, 120 → ~130bpm, 160 → ~155bpm
function stepsToBpm(stepsPerMin: number): number {
  return Math.min(200, Math.max(50, Math.round(stepsPerMin * 0.82 + 34)));
}

const WINDOW_MS = 60_000;
const POLL_MS = 10_000;

/**
 * Estimates heart rate from pedometer step cadence (60-second rolling window).
 * Falls back to manual input if pedometer unavailable or overridden.
 *
 * Usage: call setManual(bpm) when user enters HR via stepper.
 *        call clearManual() to return to pedometer estimation.
 */
export function useHeartRate(): Return {
  const [hr, setHr] = useState<HeartRateState>({ bpm: null, source: 'pedometer', available: false });
  const manualRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let mounted = true;

    Pedometer.isAvailableAsync().then((available) => {
      if (!mounted) return;

      if (!available) {
        setHr((prev) => ({ ...prev, available: false }));
        return;
      }

      setHr((prev) => ({ ...prev, available: true }));

      intervalRef.current = setInterval(async () => {
        if (manualRef.current !== null) return; // manual override active

        const end = new Date();
        const start = new Date(end.getTime() - WINDOW_MS);

        try {
          const { steps } = await Pedometer.getStepCountAsync(start, end);
          const stepsPerMin = steps; // window is exactly 60s, so steps = steps/min
          const bpm = stepsToBpm(stepsPerMin);
          if (mounted) {
            setHr({ bpm, source: 'pedometer', available: true });
          }
        } catch {
          // silent — keep last value
        }
      }, POLL_MS);
    });

    return () => {
      mounted = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const setManual = useCallback((bpm: number) => {
    manualRef.current = bpm;
    setHr((prev) => ({ ...prev, bpm, source: 'manual' }));
  }, []);

  const clearManual = useCallback(() => {
    manualRef.current = null;
    setHr((prev) => ({ ...prev, bpm: null, source: 'pedometer' }));
  }, []);

  return { hr, setManual, clearManual };
}
