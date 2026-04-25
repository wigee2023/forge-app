import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '../components/Screen';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { colours } from '../theme';
import { EnvironmentProfile } from '../data/mockData';
import { calcMissionAdjustments, MissionRisk } from '../utils/environment';
import { useWeather } from '../hooks/useWeather';

const RISK_COLOURS: Record<MissionRisk, string> = {
  Green: colours.cyan,
  Amber: colours.amber,
  Red: colours.red,
  Black: '#6B7280',
};

const TERRAIN_OPTIONS: Array<{ id: EnvironmentProfile['terrain']; label: string; icon: string }> = [
  { id: 'road', label: 'Road', icon: '🛣️' },
  { id: 'trail', label: 'Trail', icon: '🌲' },
  { id: 'hills', label: 'Hills', icon: '⛰️' },
  { id: 'sand', label: 'Sand', icon: '🏜️' },
  { id: 'mud', label: 'Mud', icon: '💧' },
  { id: 'snow', label: 'Snow', icon: '❄️' },
];

type Stepper = {
  label: string;
  value: number;
  unit: string;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
};

function StepperRow({ label, value, unit, min, max, step, onChange }: Stepper) {
  return (
    <View style={stepperStyles.row}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.controls}>
        <Pressable
          style={stepperStyles.btn}
          onPress={() => onChange(Math.max(min, value - step))}
        >
          <Text style={stepperStyles.btnText}>−</Text>
        </Pressable>
        <Text style={stepperStyles.value}>
          {value}
          <Text style={stepperStyles.unit}>{unit}</Text>
        </Text>
        <Pressable
          style={stepperStyles.btn}
          onPress={() => onChange(Math.min(max, value + step))}
        >
          <Text style={stepperStyles.btnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  label: { color: colours.text, fontWeight: '700', fontSize: 14, flex: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  btn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnText: { color: colours.text, fontSize: 18, fontWeight: '900', lineHeight: 20 },
  value: { color: colours.cyan, fontSize: 17, fontWeight: '900', minWidth: 68, textAlign: 'center' },
  unit: { color: colours.muted, fontSize: 12, fontWeight: '400' },
});

export function EnvironmentScreen() {
  const [temp, setTemp] = useState(20);
  const [humidity, setHumidity] = useState(60);
  const [altitude, setAltitude] = useState(0);
  const [wind, setWind] = useState(10);
  const [terrain, setTerrain] = useState<EnvironmentProfile['terrain']>('road');
  const [load, setLoad] = useState(18);
  const { state: weatherState, refresh: fetchWeather } = useWeather();

  function applyLiveWeather() {
    if (weatherState.status !== 'success') return;
    const { data } = weatherState;
    setTemp(data.tempCelsius);
    setHumidity(data.humidityPct);
    setWind(data.windKph);
    setAltitude(data.altitudeM);
  }

  const profile: EnvironmentProfile = useMemo(
    () => ({ tempCelsius: temp, humidityPct: humidity, altitudeM: altitude, terrain, windKph: wind }),
    [temp, humidity, altitude, terrain, wind],
  );

  const adj = useMemo(() => calcMissionAdjustments(profile, load), [profile, load]);

  const riskColour = RISK_COLOURS[adj.riskLevel];

  return (
    <Screen>
      <Text style={styles.muted}>Pre-mission planning</Text>
      <Text style={styles.title}>Environment</Text>

      {/* Live weather card */}
      <Card>
        <View style={styles.weatherRow}>
          <View style={styles.weatherLeft}>
            <Ionicons name="location" size={18} color={colours.cyan} />
            <View>
              {weatherState.status === 'idle' && (
                <Text style={styles.weatherPrompt}>Tap to load live conditions</Text>
              )}
              {weatherState.status === 'loading' && (
                <Text style={styles.weatherPrompt}>Locating…</Text>
              )}
              {weatherState.status === 'error' && (
                <Text style={[styles.weatherPrompt, { color: colours.red }]}>
                  {weatherState.message}
                </Text>
              )}
              {weatherState.status === 'success' && (
                <>
                  <Text style={styles.weatherLocation}>{weatherState.data.locationName}</Text>
                  <Text style={styles.weatherValues}>
                    {weatherState.data.tempCelsius}°C · {weatherState.data.humidityPct}% RH ·{' '}
                    {weatherState.data.windKph} kph · {weatherState.data.altitudeM}m
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.weatherButtons}>
            {weatherState.status === 'loading' ? (
              <ActivityIndicator size="small" color={colours.cyan} />
            ) : (
              <Pressable style={styles.fetchBtn} onPress={fetchWeather}>
                <Ionicons name="refresh" size={16} color={colours.cyan} />
                <Text style={styles.fetchBtnText}>
                  {weatherState.status === 'idle' ? 'Get Weather' : 'Refresh'}
                </Text>
              </Pressable>
            )}

            {weatherState.status === 'success' && (
              <Pressable style={styles.applyBtn} onPress={applyLiveWeather}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </Pressable>
            )}
          </View>
        </View>
      </Card>

      {/* Mission readiness banner */}
      <Card>
        <View style={styles.riskRow}>
          <View style={styles.riskBadge}>
            <Ionicons name="shield-checkmark" size={28} color={riskColour} />
            <Text style={[styles.riskLabel, { color: riskColour }]}>{adj.riskLevel}</Text>
          </View>
          <View style={styles.riskRight}>
            <Text style={styles.wbgtLabel}>WBGT</Text>
            <Text style={[styles.wbgtValue, { color: riskColour }]}>{adj.wbgt}°</Text>
          </View>
        </View>
        <ProgressBar value={Math.min(100, adj.wbgt * 2.5)} />
        <Text style={[styles.riskSub, { color: riskColour }]}>
          {adj.riskLevel === 'Green' && 'Train as planned'}
          {adj.riskLevel === 'Amber' && 'Reduce intensity · increase water'}
          {adj.riskLevel === 'Red' && 'Mandatory rest breaks · limit duration'}
          {adj.riskLevel === 'Black' && 'Training suspended — heat casualty risk'}
        </Text>
      </Card>

      {/* Condition inputs */}
      <Card>
        <Text style={styles.cardTitle}>Conditions</Text>
        <StepperRow label="Temperature" value={temp} unit="°C" min={-30} max={55} step={1} onChange={setTemp} />
        <StepperRow label="Humidity" value={humidity} unit="%" min={0} max={100} step={5} onChange={setHumidity} />
        <StepperRow label="Altitude" value={altitude} unit="m" min={0} max={5500} step={100} onChange={setAltitude} />
        <StepperRow label="Wind" value={wind} unit="kph" min={0} max={120} step={5} onChange={setWind} />
        <StepperRow label="Ruck Load" value={load} unit="kg" min={0} max={45} step={1} onChange={setLoad} />

        <Text style={[styles.cardTitle, { marginTop: 6 }]}>Terrain</Text>
        <View style={styles.terrainGrid}>
          {TERRAIN_OPTIONS.map((t) => {
            const active = terrain === t.id;
            return (
              <Pressable
                key={t.id}
                style={[styles.terrainChip, active && styles.terrainChipActive]}
                onPress={() => setTerrain(t.id)}
              >
                <Text style={styles.terrainEmoji}>{t.icon}</Text>
                <Text style={[styles.terrainLabel, active && styles.terrainLabelActive]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </Card>

      {/* Adjusted targets */}
      <Card>
        <Text style={styles.cardTitle}>Mission Targets</Text>

        <View style={styles.metricGrid}>
          <View style={styles.metricCell}>
            <Ionicons name="speedometer" size={20} color={colours.cyan} />
            <Text style={styles.metricValue}>−{adj.paceAdjustmentPct}%</Text>
            <Text style={styles.metricSub}>Pace adj.</Text>
          </View>
          <View style={styles.metricCell}>
            <Ionicons name="barbell" size={20} color={colours.violet} />
            <Text style={[styles.metricValue, { color: colours.violet }]}>
              {adj.loadCapKg === 0 ? 'None' : `${adj.loadCapKg}kg`}
            </Text>
            <Text style={styles.metricSub}>Max load</Text>
          </View>
          <View style={styles.metricCell}>
            <Ionicons name="water" size={20} color={colours.amber} />
            <Text style={[styles.metricValue, { color: colours.amber }]}>{adj.hydrationMlPerHour}ml</Text>
            <Text style={styles.metricSub}>Water/hr</Text>
          </View>
          <View style={styles.metricCell}>
            <Ionicons name="flash" size={20} color={colours.sand} />
            <Text style={[styles.metricValue, { color: colours.sand }]}>{adj.electrolyteMgPerHour}mg</Text>
            <Text style={styles.metricSub}>Sodium/hr</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.inlineRow}>
          <Text style={styles.inlineLabel}>Oxygen availability</Text>
          <Text style={[styles.inlineValue, adj.oxygenPct < 85 && { color: colours.red }]}>
            {adj.oxygenPct}%
          </Text>
        </View>
        <ProgressBar value={adj.oxygenPct} />

        <View style={[styles.inlineRow, { marginTop: 14 }]}>
          <Text style={styles.inlineLabel}>Terrain cost multiplier</Text>
          <Text style={styles.inlineValue}>{adj.terrainMultiplier.toFixed(2)}×</Text>
        </View>

        {temp < 10 && (
          <>
            <View style={styles.divider} />
            <View style={styles.inlineRow}>
              <Text style={styles.inlineLabel}>Wind chill</Text>
              <Text style={[styles.inlineValue, adj.windChillC < -10 && { color: colours.red }]}>
                {adj.windChillC}°C
              </Text>
            </View>
          </>
        )}
      </Card>

      {/* Warnings */}
      {adj.warnings.length > 0 && (
        <Card>
          <Text style={styles.cardTitle}>Warnings</Text>
          {adj.warnings.map((w, i) => (
            <View key={i} style={styles.warningRow}>
              <Ionicons name="warning" size={16} color={colours.amber} style={{ marginTop: 1 }} />
              <Text style={styles.warningText}>{w}</Text>
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { color: colours.muted, fontSize: 13 },
  title: { color: colours.text, fontSize: 32, fontWeight: '900', marginBottom: 16 },
  cardTitle: { color: colours.text, fontSize: 19, fontWeight: '900', marginBottom: 14 },

  riskRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  riskBadge: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  riskLabel: { fontSize: 26, fontWeight: '900' },
  riskRight: { alignItems: 'flex-end' },
  wbgtLabel: { color: colours.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  wbgtValue: { fontSize: 32, fontWeight: '900' },
  riskSub: { marginTop: 10, fontSize: 13, fontWeight: '700' },

  terrainGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  terrainChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colours.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  terrainChipActive: {
    borderColor: colours.cyan,
    backgroundColor: 'rgba(103,232,249,0.12)',
  },
  terrainEmoji: { fontSize: 14 },
  terrainLabel: { color: colours.muted, fontSize: 13, fontWeight: '700' },
  terrainLabelActive: { color: colours.cyan },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCell: {
    width: '47%',
    borderWidth: 1,
    borderColor: colours.border,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  metricValue: { color: colours.cyan, fontSize: 22, fontWeight: '900' },
  metricSub: { color: colours.muted, fontSize: 12 },

  divider: { height: 1, backgroundColor: colours.border, marginVertical: 14 },

  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  inlineLabel: { color: colours.muted, fontSize: 13, fontWeight: '600' },
  inlineValue: { color: colours.text, fontSize: 13, fontWeight: '900' },

  warningRow: { flexDirection: 'row', gap: 8, marginBottom: 10, alignItems: 'flex-start' },
  warningText: { color: colours.amber, fontSize: 13, flex: 1, lineHeight: 18 },

  weatherRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  weatherLeft: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, flex: 1 },
  weatherPrompt: { color: colours.muted, fontSize: 13 },
  weatherLocation: { color: colours.text, fontWeight: '800', fontSize: 14 },
  weatherValues: { color: colours.cyan, fontSize: 12, marginTop: 2 },
  weatherButtons: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  fetchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colours.cyan,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(103,232,249,0.08)',
  },
  fetchBtnText: { color: colours.cyan, fontSize: 12, fontWeight: '800' },
  applyBtn: {
    borderWidth: 1,
    borderColor: colours.cyan,
    borderRadius: 12,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: colours.cyan,
  },
  applyBtnText: { color: '#07111E', fontSize: 12, fontWeight: '900' },
});
