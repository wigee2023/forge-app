import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../theme';
import { CognitiveResult } from '../../data/mockData';

const TILE_COLOURS = [colours.cyan, colours.amber, colours.violet, colours.red];
const TILE_LABELS = ['A', 'B', 'C', 'D'];

type Phase = 'idle' | 'showing' | 'input' | 'success' | 'fail';

function buildSequence(length: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * 4));
}

type Props = {
  sessionId: string;
  onComplete: (result: CognitiveResult) => void;
  onClose: () => void;
};

export function MemorySequence({ sessionId, onComplete, onClose }: Props) {
  const [level, setLevel] = useState(3);
  const [bestLevel, setBestLevel] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [sequence, setSequence] = useState<number[]>([]);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const [inputSeq, setInputSeq] = useState<number[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const startShowing = useCallback((seq: number[]) => {
    setPhase('showing');
    setInputSeq([]);

    let i = 0;
    function showNext() {
      if (i >= seq.length) {
        setHighlighted(null);
        timerRef.current = setTimeout(() => setPhase('input'), 400);
        return;
      }
      setHighlighted(seq[i]);
      i++;
      timerRef.current = setTimeout(() => {
        setHighlighted(null);
        timerRef.current = setTimeout(showNext, 300);
      }, 650);
    }
    timerRef.current = setTimeout(showNext, 500);
  }, []);

  function startRound(lvl: number) {
    const seq = buildSequence(lvl);
    setSequence(seq);
    startShowing(seq);
  }

  function handleStart() {
    startRound(level);
  }

  function handleTile(tileIndex: number) {
    if (phase !== 'input') return;

    const next = [...inputSeq, tileIndex];
    const pos = next.length - 1;

    if (next[pos] !== sequence[pos]) {
      setInputSeq(next);
      setPhase('fail');
      onComplete({
        taskKind: 'memory',
        correct: false,
        sessionId,
        timestamp: Date.now(),
      });
      return;
    }

    if (next.length === sequence.length) {
      const nextLevel = Math.min(8, level + 1);
      setBestLevel((b) => Math.max(b, level));
      setInputSeq(next);
      setPhase('success');
      onComplete({
        taskKind: 'memory',
        correct: true,
        sessionId,
        timestamp: Date.now(),
      });
      timerRef.current = setTimeout(() => {
        setLevel(nextLevel);
        startRound(nextLevel);
      }, 1200);
    } else {
      setInputSeq(next);
    }
  }

  function retry() {
    setLevel(3);
    startRound(3);
  }

  const tileActive = (i: number) => {
    if (phase === 'showing') return highlighted === i;
    if (phase === 'input') return inputSeq[inputSeq.length - 1] === i && inputSeq.length > 0;
    return false;
  };

  const progress = phase === 'input' ? inputSeq.length / sequence.length : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Memory Sequence</Text>
          <Text style={styles.levelText}>
            Level {level}
            {bestLevel > 0 && <Text style={styles.best}> · Best: {bestLevel}</Text>}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colours.muted} />
        </Pressable>
      </View>

      <View style={styles.statusRow}>
        {phase === 'idle' && <Text style={styles.statusText}>Watch the sequence, then repeat it</Text>}
        {phase === 'showing' && <Text style={[styles.statusText, { color: colours.amber }]}>Memorise…</Text>}
        {phase === 'input' && <Text style={[styles.statusText, { color: colours.cyan }]}>Repeat the sequence</Text>}
        {phase === 'success' && <Text style={[styles.statusText, { color: colours.cyan }]}>Correct! Next level…</Text>}
        {phase === 'fail' && <Text style={[styles.statusText, { color: colours.red }]}>Wrong sequence</Text>}
      </View>

      {phase === 'input' && (
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
        </View>
      )}

      <View style={styles.grid}>
        {TILE_COLOURS.map((colour, i) => {
          const active = tileActive(i);
          const wasInput = phase === 'input' && inputSeq.includes(i);
          return (
            <Pressable
              key={i}
              style={[
                styles.tile,
                { borderColor: active ? colour : 'rgba(255,255,255,0.12)' },
                active && { backgroundColor: `${colour}33` },
                wasInput && !active && { backgroundColor: `${colour}18` },
              ]}
              onPress={() => handleTile(i)}
              disabled={phase !== 'input'}
            >
              <Text style={[styles.tileLabel, { color: active ? colour : colours.muted }]}>
                {TILE_LABELS[i]}
              </Text>
              {active && <View style={[styles.tileDot, { backgroundColor: colour }]} />}
            </Pressable>
          );
        })}
      </View>

      {phase === 'idle' && (
        <Pressable style={styles.primaryBtn} onPress={handleStart}>
          <Text style={styles.primaryBtnText}>Start Level {level}</Text>
        </Pressable>
      )}

      {phase === 'fail' && (
        <View style={styles.failCard}>
          <Text style={styles.failTitle}>Sequence was:</Text>
          <View style={styles.seqRow}>
            {sequence.map((t, i) => (
              <View key={i} style={[styles.seqChip, { borderColor: TILE_COLOURS[t] }]}>
                <Text style={[styles.seqChipText, { color: TILE_COLOURS[t] }]}>{TILE_LABELS[t]}</Text>
              </View>
            ))}
          </View>
          <Pressable style={styles.retryBtn} onPress={retry}>
            <Text style={styles.retryBtnText}>Restart from Level 3</Text>
          </Pressable>
        </View>
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
    marginBottom: 12,
  },
  title: { color: colours.text, fontSize: 22, fontWeight: '900' },
  levelText: { color: colours.muted, fontSize: 13, marginTop: 2 },
  best: { color: colours.cyan },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusRow: { marginBottom: 12 },
  statusText: { color: colours.muted, fontSize: 14, fontWeight: '700' },
  progressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.border,
    marginBottom: 18,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.cyan,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  tile: {
    width: '47%',
    aspectRatio: 1,
    borderRadius: 24,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  tileLabel: { fontSize: 36, fontWeight: '900' },
  tileDot: { width: 8, height: 8, borderRadius: 4 },
  primaryBtn: {
    backgroundColor: colours.cyan,
    borderRadius: 20,
    paddingVertical: 15,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#07111E', fontWeight: '900', fontSize: 15 },
  failCard: {
    borderWidth: 1,
    borderColor: colours.red,
    borderRadius: 20,
    padding: 16,
    gap: 10,
    backgroundColor: 'rgba(252,165,165,0.06)',
  },
  failTitle: { color: colours.text, fontWeight: '800' },
  seqRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  seqChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 5,
    paddingHorizontal: 12,
  },
  seqChipText: { fontWeight: '900', fontSize: 13 },
  retryBtn: {
    backgroundColor: 'rgba(252,165,165,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colours.red,
    marginTop: 4,
  },
  retryBtnText: { color: colours.red, fontWeight: '900' },
});
