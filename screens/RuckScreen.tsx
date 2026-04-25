import React, { useMemo, useState } from 'react';
import { Modal, Text, View, StyleSheet, Pressable, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { colours } from '../theme';
import { CognitiveResult, TrainingSession } from '../data/mockData';
import { useCognitiveScheduler } from '../hooks/useCognitiveScheduler';
import { ReactionDrill } from '../components/drills/ReactionDrill';
import { ShootNoShoot } from '../components/drills/ShootNoShoot';
import { MemorySequence } from '../components/drills/MemorySequence';
import { PatternRecognition } from '../components/drills/PatternRecognition';
import { useHeartRate } from '../hooks/useHeartRate';

export function RuckScreen({ addSession }: { addSession: (session: TrainingSession) => void }) {
  const [weight, setWeight] = useState(18);
  const [distance, setDistance] = useState(8);
  const [sessionActive, setSessionActive] = useState(false);
  const [cogResults, setCogResults] = useState<CognitiveResult[]>([]);
  const [manualHr, setManualHrInput] = useState(140);

  const { hr, setManual, clearManual } = useHeartRate();
  const activeBpm = hr.bpm ?? manualHr;

  // High HR → more frequent cognitive prompts (stress under fatigue)
  const cogIntervalMinutes = activeBpm >= 160 ? 3 : activeBpm >= 140 ? 4 : 5;

  const sessionId = useMemo(() => Date.now().toString(), []);
  const { pendingTask, dismiss, triggerNow } = useCognitiveScheduler({
    intervalMinutes: cogIntervalMinutes,
    enabled: sessionActive,
  });

  const pace = useMemo(() => (7.4 + weight / 25).toFixed(1), [weight]);
  const score = useMemo(() => Math.max(55, Math.round(95 - weight * 0.6 - distance * 0.4)), [weight, distance]);

  function changeWeight(amount: number) {
    setWeight((current) => Math.min(35, Math.max(5, current + amount)));
  }

  function changeDistance(amount: number) {
    setDistance((current) => Math.min(30, Math.max(2, current + amount)));
  }

  function handleCogComplete(result: CognitiveResult) {
    setCogResults((prev) => [result, ...prev]);
    dismiss();
  }

  function saveRuck() {
    const correctCount = cogResults.filter((r) => r.correct).length;
    const reactionTimes = cogResults.filter((r) => r.reactionMs).map((r) => r.reactionMs!);
    const avgReactionMs = reactionTimes.length
      ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
      : undefined;
    const cognitiveScore = cogResults.length
      ? Math.round((correctCount / cogResults.length) * 100)
      : undefined;

    const session: TrainingSession = {
      id: sessionId,
      type: 'Ruck',
      title: `${distance}km Loaded Ruck`,
      score,
      durationMinutes: Math.round(distance * Number(pace)),
      rpe: weight > 22 ? 8 : 6,
      loadKg: weight,
      heartRateBpm: hr.bpm ?? manualHr,
      date: Date.now(),
      cognitiveResults: cogResults.length ? cogResults : undefined,
      avgReactionMs,
      cognitiveScore,
    };

    addSession(session);
    setSessionActive(false);
    Alert.alert('Ruck saved', 'Your ruck session has been added to your training log.');
  }

  return (
    <Screen>
      <Text style={styles.muted}>Loaded movement</Text>
      <Text style={styles.title}>Ruck Tracker</Text>

      <Card style={styles.mapCard}>
        <Ionicons name="map" size={62} color={colours.cyan} />
        <Text style={styles.mapText}>GPS map placeholder</Text>
        <Text style={styles.muted}>Mixed terrain - elevation +120m</Text>
      </Card>

      <View style={styles.grid}>
        <MetricCard icon="barbell" label="Pack" value={`${weight}kg`} sub="ruck load" />
        <MetricCard icon="footsteps" label="Distance" value={`${distance}km`} sub={`${pace}/km est.`} tone={colours.amber} />
      </View>

      {/* Heart rate card */}
      <Card>
        <View style={styles.hrRow}>
          <View>
            <Text style={styles.muted}>Heart Rate</Text>
            <View style={styles.hrValueRow}>
              <Text style={[styles.hrValue, { color: activeBpm >= 160 ? colours.red : activeBpm >= 140 ? colours.amber : colours.cyan }]}>
                {activeBpm}
              </Text>
              <Text style={styles.hrUnit}>bpm</Text>
              <View style={[styles.hrSourceBadge, { borderColor: hr.source === 'manual' ? colours.amber : colours.cyan }]}>
                <Text style={[styles.hrSourceText, { color: hr.source === 'manual' ? colours.amber : colours.cyan }]}>
                  {hr.source === 'manual' ? 'Manual' : hr.available ? 'Estimated' : 'Manual'}
                </Text>
              </View>
            </View>
            <Text style={styles.cogIntervalText}>
              Cognitive prompts every {cogIntervalMinutes} min
            </Text>
          </View>
          <View style={styles.hrControls}>
            <Pressable style={styles.smallButton} onPress={() => { const next = Math.max(40, manualHr - 5); setManualHrInput(next); setManual(next); }}>
              <Text style={styles.smallButtonText}>-</Text>
            </Pressable>
            <Pressable
              style={[styles.smallButton, { backgroundColor: hr.source === 'pedometer' ? colours.border : colours.cyan }]}
              onPress={() => hr.source === 'manual' ? clearManual() : setManual(manualHr)}
            >
              <Ionicons name="heart" size={16} color={hr.source === 'manual' ? colours.cyan : '#07111E'} />
            </Pressable>
            <Pressable style={styles.smallButton} onPress={() => { const next = Math.min(220, manualHr + 5); setManualHrInput(next); setManual(next); }}>
              <Text style={styles.smallButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <Card>
        <Text style={styles.cardTitle}>Session Setup</Text>

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Ruck Weight</Text>
          <View style={styles.buttons}>
            <Pressable style={styles.smallButton} onPress={() => changeWeight(-1)}>
              <Text style={styles.smallButtonText}>-</Text>
            </Pressable>
            <Text style={styles.controlValue}>{weight}kg</Text>
            <Pressable style={styles.smallButton} onPress={() => changeWeight(1)}>
              <Text style={styles.smallButtonText}>+</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.controlRow}>
          <Text style={styles.controlLabel}>Distance</Text>
          <View style={styles.buttons}>
            <Pressable style={styles.smallButton} onPress={() => changeDistance(-1)}>
              <Text style={styles.smallButtonText}>-</Text>
            </Pressable>
            <Text style={styles.controlValue}>{distance}km</Text>
            <Pressable style={styles.smallButton} onPress={() => changeDistance(1)}>
              <Text style={styles.smallButtonText}>+</Text>
            </Pressable>
          </View>
        </View>
      </Card>

      <Card style={{ backgroundColor: 'rgba(103,232,249,0.08)' }}>
        <Text style={styles.muted}>Projected session score</Text>
        <Text style={styles.score}>{score}</Text>
        <Text style={styles.muted}>
          Higher distance and heavier load increase training stress. This is a planning estimate, not medical advice.
        </Text>
      </Card>

      {/* Session controls */}
      <View style={styles.sessionRow}>
        <Pressable
          style={[styles.sessionBtn, sessionActive && styles.sessionBtnActive]}
          onPress={() => setSessionActive((v) => !v)}
        >
          <Ionicons name={sessionActive ? 'stop-circle' : 'play-circle'} size={20} color={sessionActive ? colours.red : colours.cyan} />
          <Text style={[styles.sessionBtnText, { color: sessionActive ? colours.red : colours.cyan }]}>
            {sessionActive ? 'End Session' : 'Start Session'}
          </Text>
        </Pressable>

        {sessionActive && (
          <Pressable style={styles.cogBtn} onPress={() => triggerNow()}>
            <Ionicons name="pulse" size={18} color={colours.violet} />
            <Text style={styles.cogBtnText}>Test Now</Text>
          </Pressable>
        )}
      </View>

      {sessionActive && cogResults.length > 0 && (
        <Card>
          <Text style={styles.cogSummaryTitle}>Mid-Ruck Cognition</Text>
          <Text style={styles.cogSummaryText}>
            {cogResults.length} drill{cogResults.length !== 1 ? 's' : ''} completed ·{' '}
            {cogResults.filter((r) => r.correct).length} correct
          </Text>
        </Card>
      )}

      <Pressable style={styles.primaryButton} onPress={saveRuck}>
        <Text style={styles.primaryButtonText}>Save Ruck Session</Text>
      </Pressable>

      {/* Cognitive drill modal */}
      <Modal visible={pendingTask !== null} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {pendingTask === 'reaction' && (
                <ReactionDrill sessionId={sessionId} onComplete={handleCogComplete} onClose={dismiss} />
              )}
              {pendingTask === 'shoot-noshoot' && (
                <ShootNoShoot sessionId={sessionId} onComplete={handleCogComplete} onClose={dismiss} />
              )}
              {pendingTask === 'memory' && (
                <MemorySequence sessionId={sessionId} onComplete={handleCogComplete} onClose={dismiss} />
              )}
              {pendingTask === 'pattern' && (
                <PatternRecognition sessionId={sessionId} onComplete={handleCogComplete} onClose={dismiss} />
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colours.muted, fontSize: 13 },
  title: { color: colours.text, fontSize: 32, fontWeight: '900', marginBottom: 16 },
  mapCard: { height: 180, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F1F35' },
  mapText: { color: colours.text, fontWeight: '900', marginTop: 8 },
  grid: { flexDirection: 'row', gap: 12 },
  cardTitle: { color: colours.text, fontSize: 19, fontWeight: '900', marginBottom: 12 },
  controlRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 10, gap: 12 },
  controlLabel: { color: colours.text, fontWeight: '800' },
  buttons: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  smallButton: { width: 36, height: 36, borderRadius: 12, backgroundColor: colours.cyan, alignItems: 'center', justifyContent: 'center' },
  smallButtonText: { color: '#07111E', fontSize: 20, fontWeight: '900' },
  controlValue: { color: colours.text, fontWeight: '900', width: 55, textAlign: 'center' },
  score: { color: colours.cyan, fontSize: 52, fontWeight: '900', marginVertical: 4 },
  primaryButton: { backgroundColor: colours.cyan, borderRadius: 22, paddingVertical: 16, alignItems: 'center' },
  primaryButtonText: { color: '#07111E', fontWeight: '900', fontSize: 16 },
  hrRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  hrValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 2 },
  hrValue: { fontSize: 40, fontWeight: '900' },
  hrUnit: { color: colours.muted, fontSize: 14, fontWeight: '700' },
  hrSourceBadge: { borderWidth: 1, borderRadius: 8, paddingVertical: 2, paddingHorizontal: 6 },
  hrSourceText: { fontSize: 10, fontWeight: '800' },
  cogIntervalText: { color: colours.muted, fontSize: 11, marginTop: 4 },
  hrControls: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  sessionRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  sessionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colours.cyan,
    backgroundColor: 'rgba(103,232,249,0.08)',
  },
  sessionBtnActive: {
    borderColor: colours.red,
    backgroundColor: 'rgba(252,165,165,0.08)',
  },
  sessionBtnText: { fontWeight: '900', fontSize: 14 },
  cogBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colours.violet,
    backgroundColor: 'rgba(196,181,253,0.08)',
  },
  cogBtnText: { color: colours.violet, fontWeight: '900', fontSize: 13 },
  cogSummaryTitle: { color: colours.text, fontWeight: '900', marginBottom: 4 },
  cogSummaryText: { color: colours.muted, fontSize: 13 },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalSheet: {
    backgroundColor: colours.panel,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    paddingTop: 12,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colours.border,
    alignSelf: 'center',
    marginBottom: 8,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
    flexGrow: 1,
  },
});
