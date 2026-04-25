import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/Card';
import { colours } from '../theme';
import { CognitiveResult, CognitiveTaskKind } from '../data/mockData';
import { ReactionDrill } from '../components/drills/ReactionDrill';
import { ShootNoShoot } from '../components/drills/ShootNoShoot';
import { MemorySequence } from '../components/drills/MemorySequence';
import { PatternRecognition } from '../components/drills/PatternRecognition';

const SESSION_ID = 'standalone';

type DrillDef = {
  kind: CognitiveTaskKind;
  label: string;
  icon: 'flash' | 'warning' | 'grid' | 'eye';
  description: string;
  colour: string;
};

const DRILLS: DrillDef[] = [
  {
    kind: 'reaction',
    label: 'Reaction Time',
    icon: 'flash',
    description: 'Tap the moment GO appears. Measures neural speed under rest and fatigue.',
    colour: colours.cyan,
  },
  {
    kind: 'shoot-noshoot',
    label: 'Shoot / No-Shoot',
    icon: 'warning',
    description: 'Identify threat vs. non-threat in 4 seconds. Tracks decision accuracy.',
    colour: colours.amber,
  },
  {
    kind: 'memory',
    label: 'Memory Sequence',
    icon: 'grid',
    description: 'Memorise and repeat growing sequences. Measures working memory under load.',
    colour: colours.violet,
  },
  {
    kind: 'pattern',
    label: 'Pattern Recognition',
    icon: 'eye',
    description: 'Memorise a 4×4 icon grid, then recall a hidden position. Tests visual recall under time pressure.',
    colour: colours.sand,
  },
];

function statsFor(results: CognitiveResult[], kind: CognitiveTaskKind) {
  const matching = results.filter((r) => r.taskKind === kind);
  if (matching.length === 0) return null;

  if (kind === 'reaction') {
    const times = matching.map((r) => r.reactionMs!).filter(Boolean);
    const best = Math.min(...times);
    const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
    return { label: `Best ${best}ms · Avg ${avg}ms`, count: times.length };
  }

  const withCorrect = matching.filter((r) => r.correct !== undefined);
  const correct = withCorrect.filter((r) => r.correct).length;
  const accuracy = Math.round((correct / withCorrect.length) * 100);
  return { label: `${accuracy}% accuracy`, count: withCorrect.length };
}

function cognitiveScore(results: CognitiveResult[]): number | null {
  if (results.length === 0) return null;

  const reactionResults = results.filter((r) => r.taskKind === 'reaction' && r.reactionMs);
  const decisionResults = results.filter((r) => r.taskKind !== 'reaction' && r.correct !== undefined);

  let score = 70;

  if (reactionResults.length > 0) {
    const avgMs = reactionResults.reduce((a, r) => a + r.reactionMs!, 0) / reactionResults.length;
    // 200ms → 100pts, 450ms → 50pts, linear
    const reactionScore = Math.max(40, Math.min(100, Math.round(100 - (avgMs - 200) / 5)));
    score = reactionScore;
  }

  if (decisionResults.length > 0) {
    const accuracy = decisionResults.filter((r) => r.correct).length / decisionResults.length;
    score = Math.round((score + accuracy * 100) / 2);
  }

  return Math.min(100, score);
}

export function CognitiveScreen() {
  const [activeDrill, setActiveDrill] = useState<CognitiveTaskKind | null>(null);
  const [results, setResults] = useState<CognitiveResult[]>([]);

  function handleComplete(result: CognitiveResult) {
    setResults((prev) => [result, ...prev]);
  }

  function closeDrill() {
    setActiveDrill(null);
  }

  const score = cognitiveScore(results);

  if (activeDrill) {
    return (
      <View style={styles.drillWrapper}>
        <ScrollView
          style={styles.drillScroll}
          contentContainerStyle={styles.drillContent}
          keyboardShouldPersistTaps="handled"
        >
          {activeDrill === 'reaction' && (
            <ReactionDrill sessionId={SESSION_ID} onComplete={handleComplete} onClose={closeDrill} />
          )}
          {activeDrill === 'shoot-noshoot' && (
            <ShootNoShoot sessionId={SESSION_ID} onComplete={handleComplete} onClose={closeDrill} />
          )}
          {activeDrill === 'memory' && (
            <MemorySequence sessionId={SESSION_ID} onComplete={handleComplete} onClose={closeDrill} />
          )}
          {activeDrill === 'pattern' && (
            <PatternRecognition sessionId={SESSION_ID} onComplete={handleComplete} onClose={closeDrill} />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.muted}>Decision &amp; cognition</Text>
      <Text style={styles.title}>Mind</Text>

      {/* Overall cognitive score */}
      <Card>
        <View style={styles.scoreRow}>
          <View>
            <Text style={styles.muted}>Cognitive Index</Text>
            <Text style={[styles.bigScore, { color: score !== null ? colours.cyan : colours.muted }]}>
              {score !== null ? score : '—'}
            </Text>
            <Text style={[styles.scoreLabel, { color: score !== null ? colours.cyan : colours.muted }]}>
              {score === null
                ? 'Run a drill to generate your score'
                : score >= 80
                  ? 'Sharp — decision speed high'
                  : score >= 60
                    ? 'Functional — monitor under fatigue'
                    : 'Degraded — reduce task complexity'}
            </Text>
          </View>
          <View style={styles.brainIcon}>
            <Ionicons name="pulse" size={44} color={score !== null ? colours.cyan : colours.muted} />
          </View>
        </View>
        {results.length > 0 && (
          <Text style={styles.sessionCount}>{results.length} drill{results.length !== 1 ? 's' : ''} completed this session</Text>
        )}
      </Card>

      {/* Drill cards */}
      {DRILLS.map((drill) => {
        const stat = statsFor(results, drill.kind);
        return (
          <Card key={drill.kind}>
            <View style={styles.drillHeader}>
              <View style={[styles.drillIconWrap, { borderColor: drill.colour, backgroundColor: `${drill.colour}18` }]}>
                <Ionicons name={drill.icon} size={22} color={drill.colour} />
              </View>
              <View style={styles.drillMeta}>
                <Text style={styles.drillLabel}>{drill.label}</Text>
                {stat ? (
                  <Text style={[styles.drillStat, { color: drill.colour }]}>
                    {stat.label} · {stat.count} run{stat.count !== 1 ? 's' : ''}
                  </Text>
                ) : (
                  <Text style={styles.drillStat}>No data yet</Text>
                )}
              </View>
            </View>
            <Text style={styles.drillDesc}>{drill.description}</Text>
            <Pressable
              style={[styles.startBtn, { borderColor: drill.colour, backgroundColor: `${drill.colour}18` }]}
              onPress={() => setActiveDrill(drill.kind)}
            >
              <Text style={[styles.startBtnText, { color: drill.colour }]}>Run Drill</Text>
              <Ionicons name="chevron-forward" size={16} color={drill.colour} />
            </Pressable>
          </Card>
        );
      })}

      {/* Info card */}
      <Card>
        <Text style={styles.infoTitle}>Why it matters</Text>
        <Text style={styles.infoText}>
          SF selection and drone/tech-enabled warfare require operators to maintain decision accuracy
          under physical fatigue. Cognitive scores drop 15–30% after high-RPE efforts — training
          this gap directly improves operational readiness.
        </Text>
      </Card>

      <View style={{ height: 110 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colours.background },
  content: { paddingHorizontal: 20, paddingTop: 60 },
  drillWrapper: { flex: 1, backgroundColor: colours.background },
  drillScroll: { flex: 1 },
  drillContent: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 110,
    flexGrow: 1,
  },
  muted: { color: colours.muted, fontSize: 13 },
  title: { color: colours.text, fontSize: 32, fontWeight: '900', marginBottom: 16 },
  scoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  bigScore: { fontSize: 62, fontWeight: '900', lineHeight: 68 },
  scoreLabel: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  sessionCount: { color: colours.muted, fontSize: 12, marginTop: 10 },
  brainIcon: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: 'rgba(103,232,249,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  drillIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillMeta: { flex: 1 },
  drillLabel: { color: colours.text, fontSize: 16, fontWeight: '900' },
  drillStat: { color: colours.muted, fontSize: 12, marginTop: 2 },
  drillDesc: { color: colours.muted, fontSize: 13, lineHeight: 19, marginBottom: 14 },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 16,
    paddingVertical: 11,
  },
  startBtnText: { fontWeight: '900', fontSize: 14 },
  infoTitle: { color: colours.text, fontSize: 16, fontWeight: '900', marginBottom: 8 },
  infoText: { color: colours.muted, fontSize: 13, lineHeight: 20 },
});
