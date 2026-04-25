import { useCallback, useEffect, useRef, useState } from 'react';
import { CognitiveTaskKind } from '../data/mockData';

const SCHEDULABLE_TASKS: CognitiveTaskKind[] = ['reaction', 'shoot-noshoot', 'memory', 'pattern'];

function randomTask(): CognitiveTaskKind {
  return SCHEDULABLE_TASKS[Math.floor(Math.random() * SCHEDULABLE_TASKS.length)];
}

type Options = {
  intervalMinutes: number;
  enabled: boolean;
};

type Return = {
  pendingTask: CognitiveTaskKind | null;
  dismiss: () => void;
  triggerNow: (kind?: CognitiveTaskKind) => void;
};

/**
 * Fires a random cognitive task prompt every intervalMinutes while enabled.
 * Designed for mid-session integration in Ruck/Train screens.
 */
export function useCognitiveScheduler({ intervalMinutes, enabled }: Options): Return {
  const [pendingTask, setPendingTask] = useState<CognitiveTaskKind | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setPendingTask(randomTask());
    }, intervalMinutes * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, intervalMinutes]);

  const dismiss = useCallback(() => setPendingTask(null), []);

  const triggerNow = useCallback((kind?: CognitiveTaskKind) => {
    setPendingTask(kind ?? randomTask());
  }, []);

  return { pendingTask, dismiss, triggerNow };
}
