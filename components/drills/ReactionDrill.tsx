import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../theme';
import { CognitiveResult } from '../../data/mockData';

type Phase = 'idle' | 'waiting' | 'ready' | 'result' | 'toosoon';

type Rating = { label: string; colour: string };

function rating(ms: number): Rating {
  if (ms < 200) return { label: 'Elite', colour: colours.cyan };
  if (ms < 280) return { label: 'Good', colour: colours.cyan };
  if (ms < 380) return { label: 'Average', colour: colours.amber };
  return { label: 'Slow', colour: colours.red };
}

type Props = {
  sessionId: string;
  onComplete: (result: CognitiveResult) => void;
  onClose: () => void;
};

export function ReactionDrill({ sessionId, onComplete, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [reactionMs, setReactionMs] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  function startWaiting() {
    setPhase('waiting');
    const delay = 1500 + Math.random() * 2500;
    timerRef.current = setTimeout(() => {
      startRef.current = Date.now();
      setPhase('ready');
    }, delay);
  }

  const handleTap = useCallback(() => {
    if (phase === 'idle') {
      startWaiting();
      return;
    }
    if (phase === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhase('toosoon');
      return;
    }
    if (phase === 'ready') {
      const ms = Date.now() - startRef.current;
      setReactionMs(ms);
      setPhase('result');
      setHistory((h) => [ms, ...h].slice(0, 5));
      onComplete({
        taskKind: 'reaction',
        reactionMs: ms,
        correct: true,
        sessionId,
        timestamp: Date.now(),
      });
    }
  }, [phase, sessionId, onComplete]);

  const r = reactionMs ? rating(reactionMs) : null;
  const bestMs = history.length ? Math.min(...history) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reaction Drill</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colours.muted} />
        </Pressable>
      </View>

      <Pressable
        style={[
          styles.arena,
          phase === 'ready' && styles.arenaReady,
          phase === 'toosoon' && styles.arenaTooSoon,
        ]}
        onPress={handleTap}
        accessible={false}
      >
        {phase === 'idle' && (
          <>
            <View style={styles.circle}>
              <Ionicons name="flash" size={40} color={colours.muted} />
            </View>
            <Text style={styles.arenaLabel}>TAP TO START</Text>
            {bestMs !== null && (
              <Text style={styles.arenaSub}>Best: {bestMs}ms</Text>
            )}
          </>
        )}

        {phase === 'waiting' && (
          <>
            <View style={[styles.circle, styles.circleWaiting]}>
              <Ionicons name="eye" size={40} color={colours.muted} />
            </View>
            <Text style={styles.arenaLabel}>Get ready…</Text>
            <Text style={styles.arenaSub}>Don't tap yet</Text>
          </>
        )}

        {phase === 'ready' && (
          <>
            <View style={[styles.circle, styles.circleReady]}>
              <Text style={styles.goText}>GO</Text>
            </View>
            <Text style={[styles.arenaLabel, { color: colours.cyan }]}>TAP NOW</Text>
          </>
        )}

        {phase === 'toosoon' && (
          <>
            <View style={[styles.circle, styles.circleFail]}>
              <Ionicons name="close-circle" size={44} color={colours.red} />
            </View>
            <Text style={[styles.arenaLabel, { color: colours.red }]}>TOO EARLY</Text>
            <Text style={styles.arenaSub}>Wait for GO</Text>
          </>
        )}

        {phase === 'result' && r && (
          <>
            <View style={[styles.circle, { borderColor: r.colour, backgroundColor: `${r.colour}22` }]}>
              <Text style={[styles.resultMs, { color: r.colour }]}>{reactionMs}</Text>
              <Text style={[styles.resultMsLabel, { color: r.colour }]}>ms</Text>
            </View>
            <Text style={[styles.arenaLabel, { color: r.colour }]}>{r.label}</Text>
            <Text style={styles.arenaSub}>Tap to go again</Text>
          </>
        )}
      </Pressable>

      {history.length > 0 && (
        <View style={styles.historyRow}>
          {history.map((ms, i) => {
            const { colour } = rating(ms);
            return (
              <View key={i} style={[styles.historyChip, { borderColor: colour }]}>
                <Text style={[styles.historyText, { color: colour }]}>{ms}ms</Text>
              </View>
            );
          })}
        </View>
      )}

      {(phase === 'result' || phase === 'toosoon') && (
        <Pressable
          style={styles.retryBtn}
          onPress={() => setPhase('idle')}
        >
          <Text style={styles.retryBtnText}>Try Again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { color: colours.text, fontSize: 22, fontWeight: '900' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arena: {
    flex: 1,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 280,
  },
  arenaReady: {
    borderColor: colours.cyan,
    backgroundColor: 'rgba(103,232,249,0.06)',
  },
  arenaTooSoon: {
    borderColor: colours.red,
    backgroundColor: 'rgba(252,165,165,0.06)',
  },
  circle: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderColor: colours.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleWaiting: { borderColor: 'rgba(148,163,184,0.3)' },
  circleReady: {
    borderColor: colours.cyan,
    backgroundColor: 'rgba(103,232,249,0.18)',
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  circleFail: { borderColor: colours.red, backgroundColor: 'rgba(252,165,165,0.08)' },
  goText: { color: colours.cyan, fontSize: 42, fontWeight: '900' },
  arenaLabel: { color: colours.text, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  arenaSub: { color: colours.muted, fontSize: 13 },
  resultMs: { fontSize: 48, fontWeight: '900', lineHeight: 52 },
  resultMsLabel: { fontSize: 14, fontWeight: '700', marginTop: -4 },
  historyRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 14,
    flexWrap: 'wrap',
  },
  historyChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  historyText: { fontSize: 12, fontWeight: '700' },
  retryBtn: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    paddingVertical: 13,
    alignItems: 'center',
    marginTop: 8,
  },
  retryBtnText: { color: colours.text, fontWeight: '900' },
});
