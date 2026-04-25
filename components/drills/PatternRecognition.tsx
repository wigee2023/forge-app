import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../theme';
import { CognitiveResult } from '../../data/mockData';

type IconKey = 'star' | 'heart' | 'flash' | 'shield-checkmark';

const ICONS: IconKey[] = ['star', 'heart', 'flash', 'shield-checkmark'];
const ICON_COLOURS: Record<IconKey, string> = {
  'star': colours.amber,
  'heart': colours.red,
  'flash': colours.cyan,
  'shield-checkmark': colours.violet,
};

const DISPLAY_MS_BY_LEVEL: Record<number, number> = {
  1: 3000,
  2: 2000,
  3: 1500,
  4: 1000,
  5: 800,
};

function buildGrid(): IconKey[] {
  // 4×4 = 16 cells, 4 of each icon — shuffled
  const base = ICONS.flatMap((icon) => Array(4).fill(icon) as IconKey[]);
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [base[i], base[j]] = [base[j], base[i]];
  }
  return base;
}

type Phase = 'idle' | 'showing' | 'answer' | 'result';

type Props = {
  sessionId: string;
  onComplete: (result: CognitiveResult) => void;
  onClose: () => void;
};

export function PatternRecognition({ sessionId, onComplete, onClose }: Props) {
  const [level, setLevel] = useState(1);
  const [bestLevel, setBestLevel] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [grid, setGrid] = useState<IconKey[]>([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef(0);

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  function startRound(lvl: number) {
    const newGrid = buildGrid();
    const target = Math.floor(Math.random() * 16);
    const displayMs = DISPLAY_MS_BY_LEVEL[Math.min(lvl, 5)] ?? 800;

    setGrid(newGrid);
    setTargetIndex(target);
    setTimeLeft(displayMs);
    setPhase('showing');
    setLastCorrect(null);

    const tick = 100;
    let remaining = displayMs;
    timerRef.current = setInterval(() => {
      remaining -= tick;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        startRef.current = Date.now();
        setPhase('answer');
      }
    }, tick);
  }

  function handleAnswer(icon: IconKey) {
    if (phase !== 'answer') return;
    const ms = Date.now() - startRef.current;
    const isCorrect = icon === grid[targetIndex];

    setTotal((t) => t + 1);
    setLastCorrect(isCorrect);
    setPhase('result');

    if (isCorrect) {
      setCorrect((c) => c + 1);
      const nextLevel = Math.min(8, level + 1);
      setBestLevel((b) => Math.max(b, level));
      setLevel(nextLevel);
    }

    onComplete({
      taskKind: 'pattern',
      reactionMs: ms,
      correct: isCorrect,
      sessionId,
      timestamp: Date.now(),
    });
  }

  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
  const displayMs = DISPLAY_MS_BY_LEVEL[Math.min(level, 5)] ?? 800;
  const timerPct = (timeLeft / displayMs) * 100;
  const targetIcon = grid[targetIndex];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Pattern Recognition</Text>
          <Text style={styles.sub}>
            Level {level}
            {bestLevel > 0 && <Text style={styles.best}> · Best: {bestLevel}</Text>}
            {accuracy !== null && <Text>  ·  {accuracy}% acc</Text>}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colours.muted} />
        </Pressable>
      </View>

      {/* Status */}
      <View style={styles.statusRow}>
        {phase === 'idle' && <Text style={styles.statusText}>Memorise the icon grid, then recall a hidden position</Text>}
        {phase === 'showing' && <Text style={[styles.statusText, { color: colours.amber }]}>Memorise grid — {(timeLeft / 1000).toFixed(1)}s</Text>}
        {phase === 'answer' && <Text style={[styles.statusText, { color: colours.cyan }]}>What icon was here?</Text>}
        {phase === 'result' && (
          <Text style={[styles.statusText, { color: lastCorrect ? colours.cyan : colours.red }]}>
            {lastCorrect ? 'Correct!' : `Wrong — it was ${targetIcon}`}
          </Text>
        )}
      </View>

      {/* Timer bar */}
      {phase === 'showing' && (
        <View style={styles.timerBg}>
          <View style={[styles.timerFill, { width: `${timerPct}%` }]} />
        </View>
      )}

      {/* Grid */}
      {(phase === 'showing' || phase === 'answer' || phase === 'result') && grid.length > 0 && (
        <View style={styles.grid}>
          {grid.map((icon, i) => {
            const isTarget = i === targetIndex;
            const revealed = phase === 'showing';
            const showAnswer = phase === 'result' && isTarget;

            return (
              <View
                key={i}
                style={[
                  styles.cell,
                  isTarget && (phase === 'answer' || phase === 'result') && styles.cellTarget,
                  showAnswer && { borderColor: lastCorrect ? colours.cyan : colours.red },
                ]}
              >
                {revealed || showAnswer ? (
                  <Ionicons
                    name={icon}
                    size={22}
                    color={showAnswer && !lastCorrect ? colours.red : ICON_COLOURS[icon]}
                  />
                ) : isTarget && phase === 'answer' ? (
                  <Text style={styles.questionMark}>?</Text>
                ) : (
                  <View style={styles.hiddenDot} />
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Answer choices */}
      {phase === 'answer' && (
        <View style={styles.choices}>
          {ICONS.map((icon) => (
            <Pressable
              key={icon}
              style={[styles.choiceBtn, { borderColor: ICON_COLOURS[icon] }]}
              onPress={() => handleAnswer(icon)}
            >
              <Ionicons name={icon} size={28} color={ICON_COLOURS[icon]} />
            </Pressable>
          ))}
        </View>
      )}

      {/* Start / next */}
      {phase === 'idle' && (
        <Pressable style={styles.primaryBtn} onPress={() => startRound(level)}>
          <Text style={styles.primaryBtnText}>Start Level {level}</Text>
        </Pressable>
      )}

      {phase === 'result' && (
        <Pressable style={styles.nextBtn} onPress={() => startRound(level)}>
          <Text style={styles.nextBtnText}>Next Round</Text>
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
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  title: { color: colours.text, fontSize: 22, fontWeight: '900' },
  sub: { color: colours.muted, fontSize: 12, marginTop: 2 },
  best: { color: colours.cyan },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    borderColor: colours.border, alignItems: 'center', justifyContent: 'center',
  },
  statusRow: { marginBottom: 10, minHeight: 20 },
  statusText: { color: colours.muted, fontSize: 13, fontWeight: '700' },
  timerBg: { height: 4, borderRadius: 2, backgroundColor: colours.border, marginBottom: 12, overflow: 'hidden' },
  timerFill: { height: 4, borderRadius: 2, backgroundColor: colours.amber },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 18,
  },
  cell: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellTarget: {
    borderColor: colours.cyan,
    backgroundColor: 'rgba(103,232,249,0.12)',
  },
  questionMark: { color: colours.cyan, fontSize: 22, fontWeight: '900' },
  hiddenDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colours.border },
  choices: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginBottom: 16 },
  choiceBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtn: { backgroundColor: colours.cyan, borderRadius: 20, paddingVertical: 14, alignItems: 'center' },
  primaryBtnText: { color: '#07111E', fontWeight: '900', fontSize: 15 },
  nextBtn: {
    borderWidth: 1, borderColor: colours.violet, borderRadius: 18,
    paddingVertical: 13, alignItems: 'center',
    backgroundColor: 'rgba(196,181,253,0.1)',
  },
  nextBtnText: { color: colours.violet, fontWeight: '900' },
});
