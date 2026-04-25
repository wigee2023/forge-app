import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { MetricCard } from '../components/MetricCard';
import { ProgressBar } from '../components/ProgressBar';
import { colours } from '../theme';
import { TrainingSession } from '../data/mockData';

const DAY_MS = 86400000;

// ── Helpers ──────────────────────────────────────────────────────────────────

function averageScore(sessions: TrainingSession[]): number {
  if (!sessions.length) return 0;
  return Math.round(sessions.reduce((a, s) => a + s.score, 0) / sessions.length);
}

// Sessions in last 7 days as a fraction of a 5-day weekly target (Mon–Fri)
function weeklyCompliance(sessions: TrainingSession[]): number {
  const cutoff = Date.now() - 7 * DAY_MS;
  const recent = sessions.filter((s) => s.date && s.date > cutoff);
  return Math.min(100, Math.round((recent.length / 5) * 100));
}

// 7-day bar chart: index 0 = Mon ... 6 = Sun of the current ISO week
function weeklyChart(sessions: TrainingSession[]): { pct: number; day: string; mins: number }[] {
  const today = new Date();
  const dayOfWeek = (today.getDay() + 6) % 7; // Mon = 0
  const weekStart = new Date(today.getTime() - dayOfWeek * DAY_MS);
  weekStart.setHours(0, 0, 0, 0);

  const totals = new Array(7).fill(0) as number[];
  for (const s of sessions) {
    if (!s.date) continue;
    const diff = Math.floor((s.date - weekStart.getTime()) / DAY_MS);
    if (diff >= 0 && diff < 7) totals[diff] += s.durationMinutes;
  }

  const max = Math.max(...totals, 1);
  const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  return days.map((day, i) => ({ day, mins: totals[i], pct: Math.round((totals[i] / max) * 100) }));
}

// Score trend: compare most-recent 3 vs previous 3 sessions
function scoreTrend(sessions: TrainingSession[]): 'up' | 'down' | 'stable' {
  if (sessions.length < 4) return 'stable';
  const avg = (arr: TrainingSession[]) =>
    arr.reduce((a, s) => a + s.score, 0) / arr.length;
  const recentAvg = avg(sessions.slice(0, 3));
  const prevAvg = avg(sessions.slice(3, 6));
  if (recentAvg > prevAvg + 2) return 'up';
  if (recentAvg < prevAvg - 2) return 'down';
  return 'stable';
}

// Per-type load progression (avg score per type from recent → older)
function typeProgression(sessions: TrainingSession[]) {
  const types = ['Ruck', 'Strength', 'Run', 'Mobility'] as const;
  return types.map((type) => {
    const matching = sessions.filter((s) => s.type === type);
    const avg = matching.length
      ? Math.round(matching.reduce((a, s) => a + s.score, 0) / matching.length)
      : null;
    return { type, avg, count: matching.length };
  }).filter((t) => t.count > 0);
}

// Avg heart rate across sessions that have it
function avgHeartRate(sessions: TrainingSession[]): number | null {
  const withHR = sessions.filter((s) => s.heartRateBpm);
  if (!withHR.length) return null;
  return Math.round(withHR.reduce((a, s) => a + s.heartRateBpm!, 0) / withHR.length);
}

// Avg cognitive score across sessions that have it
function avgCognitive(sessions: TrainingSession[]): number | null {
  const with_ = sessions.filter((s) => s.cognitiveScore !== undefined);
  if (!with_.length) return null;
  return Math.round(with_.reduce((a, s) => a + s.cognitiveScore!, 0) / with_.length);
}

// Risk: flag if avg RPE last 3 sessions ≥ 8 or load is declining
function riskStatus(sessions: TrainingSession[]): { level: 'low' | 'medium' | 'high'; message: string } {
  if (sessions.length < 2) return { level: 'low', message: 'Not enough data to assess risk.' };
  const recentRpe = sessions.slice(0, 3).reduce((a, s) => a + s.rpe, 0) / Math.min(sessions.length, 3);
  if (recentRpe >= 8.5) return { level: 'high', message: 'High RPE trend — mandatory recovery day recommended.' };
  if (recentRpe >= 7) return { level: 'medium', message: 'Medium load increase — monitor sleep and HRV.' };
  return { level: 'low', message: 'Load within safe parameters. Continue as planned.' };
}

const TREND_ICONS = { up: 'trending-up', down: 'trending-down', stable: 'remove' } as const;
const TREND_COLOURS = { up: colours.cyan, down: colours.red, stable: colours.muted };
const RISK_COLOURS = { low: colours.cyan, medium: colours.amber, high: colours.red };

// ── Component ─────────────────────────────────────────────────────────────────

export function AnalyticsScreen({ sessions }: { sessions: TrainingSession[] }) {
  const avg = averageScore(sessions);
  const compliance = weeklyCompliance(sessions);
  const chart = weeklyChart(sessions);
  const trend = scoreTrend(sessions);
  const progression = typeProgression(sessions);
  const avgHR = avgHeartRate(sessions);
  const cogScore = avgCognitive(sessions);
  const risk = riskStatus(sessions);

  return (
    <Screen>
      <Text style={styles.muted}>Performance intelligence</Text>
      <Text style={styles.title}>Analytics</Text>

      {/* Top KPIs */}
      <View style={styles.grid}>
        <MetricCard
          icon="speedometer"
          label="Avg Score"
          value={avg > 0 ? `${avg}` : '—'}
          sub="all sessions"
        />
        <MetricCard
          icon="checkmark-circle"
          label="Compliance"
          value={`${compliance}%`}
          sub="7-day · 5-session target"
          tone={colours.violet}
        />
      </View>

      {avgHR !== null && (
        <View style={styles.grid}>
          <MetricCard icon="heart" label="Avg HR" value={`${avgHR}`} sub="bpm · logged sessions" tone={colours.red} />
          {cogScore !== null && (
            <MetricCard icon="pulse" label="Cognitive" value={`${cogScore}`} sub="index · mid-session" tone={colours.sand} />
          )}
        </View>
      )}

      {/* Weekly load chart */}
      <Card>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Weekly Load</Text>
          <View style={styles.trendPill}>
            <Ionicons name={TREND_ICONS[trend]} size={14} color={TREND_COLOURS[trend]} />
            <Text style={[styles.trendText, { color: TREND_COLOURS[trend] }]}>
              {trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}
            </Text>
          </View>
        </View>
        <View style={styles.chart}>
          {chart.map(({ pct, mins }, i) => (
            <View key={i} style={styles.barCol}>
              <Text style={styles.barMins}>{mins > 0 ? `${mins}` : ''}</Text>
              <View style={styles.barBg}>
                <View style={[styles.barFill, { height: `${Math.max(pct, 4)}%` }]} />
              </View>
            </View>
          ))}
        </View>
        <View style={styles.days}>
          {chart.map(({ day }, i) => (
            <Text key={i} style={styles.day}>{day}</Text>
          ))}
        </View>
      </Card>

      {/* Type progression */}
      {progression.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>Type Progression</Text>
          {progression.map(({ type, avg: typeAvg, count }) => (
            <View key={type} style={styles.progressRow}>
              <View style={styles.progressLabel}>
                <Text style={styles.progressType}>{type}</Text>
                <Text style={styles.progressCount}>{count} session{count !== 1 ? 's' : ''}</Text>
              </View>
              <Text style={styles.progressScore}>{typeAvg}</Text>
              <View style={styles.progressBarWrap}>
                <ProgressBar value={typeAvg ?? 0} />
              </View>
            </View>
          ))}
        </Card>
      )}

      {/* Cognitive card — only if any session has cognitive data */}
      {cogScore !== null && (
        <Card>
          <Text style={styles.cardTitle}>Cognitive Intel</Text>
          <View style={styles.cogRow}>
            <View>
              <Text style={styles.cogScore}>{cogScore}</Text>
              <Text style={styles.muted}>index · mid-session drills</Text>
            </View>
            <Ionicons name="pulse" size={40} color={colours.sand} />
          </View>
          <Text style={[styles.cogStatus, {
            color: cogScore >= 75 ? colours.cyan : cogScore >= 55 ? colours.amber : colours.red,
          }]}>
            {cogScore >= 75
              ? 'Sharp — decision speed within normal range'
              : cogScore >= 55
                ? 'Functional — some fatigue-induced degradation'
                : 'Degraded — reduce task load post-workout'}
          </Text>
        </Card>
      )}

      {/* Risk monitor */}
      <Card>
        <Text style={styles.cardTitle}>Risk Monitor</Text>
        <View style={[styles.riskBanner, { borderColor: `${RISK_COLOURS[risk.level]}44`, backgroundColor: `${RISK_COLOURS[risk.level]}10` }]}>
          <Ionicons name="warning" size={16} color={RISK_COLOURS[risk.level]} />
          <Text style={[styles.riskText, { color: RISK_COLOURS[risk.level] }]}>{risk.message}</Text>
        </View>
        {progression.map(({ type, avg: typeAvg }) => (
          <View key={type}>
            <Text style={styles.metricLabel}>{type} progression</Text>
            <ProgressBar value={typeAvg ?? 0} />
          </View>
        ))}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colours.muted, fontSize: 13 },
  title: { color: colours.text, fontSize: 32, fontWeight: '900', marginBottom: 16 },
  grid: { flexDirection: 'row', gap: 12, marginBottom: 0 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { color: colours.text, fontSize: 19, fontWeight: '900' },
  trendPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { fontSize: 12, fontWeight: '700' },
  chart: { height: 120, flexDirection: 'row', gap: 6, alignItems: 'flex-end' },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  barMins: { color: colours.muted, fontSize: 8, fontWeight: '700' },
  barBg: { width: '100%', flex: 1, justifyContent: 'flex-end' },
  barFill: { width: '100%', backgroundColor: colours.cyan, borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  days: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 8 },
  day: { color: colours.muted, fontSize: 11 },
  progressRow: { marginBottom: 14 },
  progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressType: { color: colours.text, fontWeight: '800', fontSize: 14 },
  progressCount: { color: colours.muted, fontSize: 12 },
  progressScore: { color: colours.cyan, fontWeight: '900', fontSize: 13, marginBottom: 4 },
  progressBarWrap: {},
  cogRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cogScore: { color: colours.sand, fontSize: 52, fontWeight: '900', lineHeight: 56 },
  cogStatus: { fontSize: 13, fontWeight: '700', marginTop: 4 },
  riskBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
  },
  riskText: { flex: 1, fontSize: 13, fontWeight: '700', lineHeight: 18 },
  metricLabel: { color: colours.text, marginTop: 12, marginBottom: 6, fontWeight: '800', fontSize: 13 },
});
