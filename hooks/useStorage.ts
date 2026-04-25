import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';

type SetValue<T> = (value: T | ((prev: T) => T)) => void;

/**
 * useState-compatible hook that persists to AsyncStorage.
 * Reads from storage on mount; writes on every change.
 */
export function useStorage<T>(key: string, initialValue: T): [T, SetValue<T>, boolean] {
  const [value, setValueRaw] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const keyRef = useRef(key);

  // Load on mount
  useEffect(() => {
    AsyncStorage.getItem(keyRef.current)
      .then((stored) => {
        if (stored !== null) {
          try {
            setValueRaw(JSON.parse(stored));
          } catch {
            // corrupt data — keep initialValue
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  // Persist on change (skip first render before load completes)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!loaded) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    AsyncStorage.setItem(keyRef.current, JSON.stringify(value)).catch(() => {
      // storage write failure is non-fatal
    });
  }, [value, loaded]);

  const setValue: SetValue<T> = useCallback((next) => {
    setValueRaw((prev) => (typeof next === 'function' ? (next as (p: T) => T)(prev) : next));
  }, []);

  return [value, setValue, loaded];
}
