import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colours } from '../../theme';
import { CognitiveResult } from '../../data/mockData';

type Answer = 'engage' | 'hold';

type Scenario = {
  id: number;
  urgency: 'HIGH' | 'MEDIUM' | 'LOW';
  situation: string;
  context: string;
  correct: Answer;
  explanation: string;
};

const SCENARIOS: Scenario[] = [
  {
    id: 1,
    urgency: 'HIGH',
    situation: 'Armed figure raises weapon toward friendlies at 50m',
    context: 'Clear line of sight. No civilians in arc. ROE permits.',
    correct: 'engage',
    explanation: 'Imminent threat to friendly forces — immediate engagement authorised.',
  },
  {
    id: 2,
    urgency: 'MEDIUM',
    situation: 'Civilian fleeing explosion — no weapon visible',
    context: 'Running away from blast site. Hands empty and visible.',
    correct: 'hold',
    explanation: 'No weapon present. Civilian fleeing an incident — hold fire.',
  },
  {
    id: 3,
    urgency: 'MEDIUM',
    situation: 'Military uniform, weapon slung, both hands raised',
    context: 'Approaching your position slowly. Calls out friendly unit identifier.',
    correct: 'hold',
    explanation: 'Weapon slung + hands raised = surrender posture. Verify identity.',
  },
  {
    id: 4,
    urgency: 'HIGH',
    situation: 'Vehicle accelerating toward checkpoint — signals ignored',
    context: 'Three warning signals given. Speed increasing. 30m and closing.',
    correct: 'engage',
    explanation: 'Vehicle IED threat profile. Non-compliance after escalation of force.',
  },
  {
    id: 5,
    urgency: 'LOW',
    situation: 'Person filming from rooftop — mobile phone only',
    context: 'No weapon. No hostile act observed. Busy civilian area.',
    correct: 'hold',
    explanation: 'Filming alone is not a hostile act. Hold fire and observe.',
  },
  {
    id: 6,
    urgency: 'HIGH',
    situation: 'Figure in alleyway raises RPG toward convoy',
    context: 'Weapon clearly identified. Hostile act imminent.',
    correct: 'engage',
    explanation: 'Positively identified RPG aimed at friendly convoy — engage.',
  },
  {
    id: 7,
    urgency: 'HIGH',
    situation: 'Child running toward position holding a bag',
    context: 'Crowd behind them. Bag shape inconsistent with IED profile.',
    correct: 'hold',
    explanation: 'Bag profile does not confirm threat. Civilian protection paramount.',
  },
  {
    id: 8,
    urgency: 'HIGH',
    situation: 'Individual retrieves object from ground — appears to be firearm',
    context: 'Isolated area. Object retrieved and being raised toward your team.',
    correct: 'engage',
    explanation: 'Weapon retrieved and raised at friendly forces — immediate threat.',
  },
  {
    id: 9,
    urgency: 'MEDIUM',
    situation: 'Wounded combatant on ground reaching toward AK-47',
    context: 'Weapon 30cm from hand. Combatant still conscious.',
    correct: 'engage',
    explanation: 'Combatant reaching for weapon remains a threat until secured.',
  },
  {
    id: 10,
    urgency: 'LOW',
    situation: 'Unarmed person arguing loudly with a soldier',
    context: 'No weapon. No physical assault. Verbal only.',
    correct: 'hold',
    explanation: 'Verbal confrontation alone does not meet threshold for lethal force.',
  },
];

const URGENCY_COLOUR: Record<Scenario['urgency'], string> = {
  HIGH: colours.red,
  MEDIUM: colours.amber,
  LOW: colours.cyan,
};

const TIMER_MS = 4000;
const TICK_MS = 80;

type Props = {
  sessionId: string;
  onComplete: (result: CognitiveResult) => void;
  onClose: () => void;
};

export function ShootNoShoot({ sessionId, onComplete, onClose }: Props) {
  const [index, setIndex] = useState(() => Math.floor(Math.random() * SCENARIOS.length));
  const [phase, setPhase] = useState<'scenario' | 'result'>('scenario');
  const [chosen, setChosen] = useState<Answer | 'timeout' | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMER_MS);
  const [correct, setCorrect] = useState(0);
  const [total, setTotal] = useState(0);
  const startRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const scenario = SCENARIOS[index];

  const resolve = useCallback(
    (answer: Answer | 'timeout') => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      const ms = Date.now() - startRef.current;
      const isCorrect = answer !== 'timeout' && answer === scenario.correct;
      setChosen(answer);
      setPhase('result');
      setTotal((t) => t + 1);
      if (isCorrect) setCorrect((c) => c + 1);
      onComplete({
        taskKind: 'shoot-noshoot',
        reactionMs: ms,
        correct: isCorrect,
        sessionId,
        timestamp: Date.now(),
      });
    },
    [scenario, sessionId, onComplete],
  );

  useEffect(() => {
    setPhase('scenario');
    setChosen(null);
    setTimeLeft(TIMER_MS);
    startRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= TICK_MS) {
          resolve('timeout');
          return 0;
        }
        return t - TICK_MS;
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [index]);

  function nextScenario() {
    setIndex((i) => (i + 1) % SCENARIOS.length);
  }

  const isCorrect = chosen !== 'timeout' && chosen === scenario.correct;
  const accuracy = total > 0 ? Math.round((correct / total) * 100) : null;
  const timerPct = (timeLeft / TIMER_MS) * 100;
  const urgencyColour = URGENCY_COLOUR[scenario.urgency];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Shoot / No-Shoot</Text>
          {accuracy !== null && (
            <Text style={styles.accuracy}>{accuracy}% accuracy · {total} scenario{total !== 1 ? 's' : ''}</Text>
          )}
        </View>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={22} color={colours.muted} />
        </Pressable>
      </View>

      <View style={[styles.urgencyBadge, { borderColor: urgencyColour }]}>
        <Text style={[styles.urgencyText, { color: urgencyColour }]}>{scenario.urgency} PRIORITY</Text>
      </View>

      <View style={styles.scenarioCard}>
        <Text style={styles.situation}>{scenario.situation}</Text>
        <Text style={styles.context}>{scenario.context}</Text>
      </View>

      {phase === 'scenario' && (
        <>
          <View style={styles.timerBarBg}>
            <View style={[styles.timerBarFill, { width: `${timerPct}%`, backgroundColor: timerPct < 30 ? colours.red : colours.cyan }]} />
          </View>

          <View style={styles.buttonRow}>
            <Pressable style={[styles.actionBtn, styles.engageBtn]} onPress={() => resolve('engage')}>
              <Ionicons name="warning" size={22} color="#07111E" />
              <Text style={styles.actionBtnText}>ENGAGE</Text>
            </Pressable>
            <Pressable style={[styles.actionBtn, styles.holdBtn]} onPress={() => resolve('hold')}>
              <Ionicons name="hand-left" size={22} color="#07111E" />
              <Text style={styles.actionBtnText}>HOLD</Text>
            </Pressable>
          </View>
        </>
      )}

      {phase === 'result' && (
        <View style={[styles.resultCard, { borderColor: isCorrect ? colours.cyan : colours.red }]}>
          <View style={styles.resultHeader}>
            <Ionicons
              name={isCorrect ? 'checkmark-circle' : 'close-circle'}
              size={28}
              color={isCorrect ? colours.cyan : colours.red}
            />
            <Text style={[styles.resultVerdict, { color: isCorrect ? colours.cyan : colours.red }]}>
              {chosen === 'timeout' ? 'TIME OUT' : isCorrect ? 'CORRECT' : 'INCORRECT'}
            </Text>
          </View>
          <Text style={styles.explanation}>{scenario.explanation}</Text>
          <Text style={styles.correctAnswer}>
            Correct: <Text style={{ color: colours.cyan, fontWeight: '900' }}>{scenario.correct.toUpperCase()}</Text>
          </Text>

          <Pressable style={styles.nextBtn} onPress={nextScenario}>
            <Text style={styles.nextBtnText}>Next Scenario</Text>
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
    marginBottom: 14,
  },
  title: { color: colours.text, fontSize: 22, fontWeight: '900' },
  accuracy: { color: colours.muted, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colours.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  urgencyText: { fontSize: 11, fontWeight: '900', letterSpacing: 2 },
  scenarioCard: {
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.25)',
    marginBottom: 16,
    gap: 8,
  },
  situation: { color: colours.text, fontSize: 17, fontWeight: '800', lineHeight: 24 },
  context: { color: colours.muted, fontSize: 13, lineHeight: 19 },
  timerBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colours.border,
    marginBottom: 18,
    overflow: 'hidden',
  },
  timerBarFill: { height: 6, borderRadius: 3 },
  buttonRow: { flexDirection: 'row', gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 18,
    borderRadius: 20,
  },
  engageBtn: { backgroundColor: colours.red },
  holdBtn: { backgroundColor: colours.cyan },
  actionBtnText: { color: '#07111E', fontSize: 16, fontWeight: '900' },
  resultCard: {
    borderWidth: 1,
    borderRadius: 22,
    padding: 18,
    backgroundColor: 'rgba(0,0,0,0.2)',
    gap: 10,
  },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  resultVerdict: { fontSize: 20, fontWeight: '900' },
  explanation: { color: colours.text, fontSize: 14, lineHeight: 20 },
  correctAnswer: { color: colours.muted, fontSize: 13 },
  nextBtn: {
    marginTop: 8,
    backgroundColor: 'rgba(103,232,249,0.15)',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colours.cyan,
  },
  nextBtnText: { color: colours.cyan, fontWeight: '900' },
});
