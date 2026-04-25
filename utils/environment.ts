import { EnvironmentProfile } from '../data/mockData';

export type MissionRisk = 'Green' | 'Amber' | 'Red' | 'Black';

export type MissionAdjustments = {
  wbgt: number;
  windChillC: number;
  oxygenPct: number;
  riskLevel: MissionRisk;
  paceAdjustmentPct: number;
  loadCapKg: number;
  hydrationMlPerHour: number;
  electrolyteMgPerHour: number;
  terrainMultiplier: number;
  warnings: string[];
};

// Stull (2011) wet-bulb approximation — accurate to ±0.3°C for H 5–99%
function wetBulb(tempC: number, humidityPct: number): number {
  return (
    tempC * Math.atan(0.151977 * Math.sqrt(humidityPct + 8.313659)) +
    Math.atan(tempC + humidityPct) -
    Math.atan(humidityPct - 1.676331) +
    0.00391838 * Math.pow(humidityPct, 1.5) * Math.atan(0.023101 * humidityPct) -
    4.686035
  );
}

// Simplified outdoor WBGT — assumes partial solar load
function calcWBGT(tempC: number, humidityPct: number): number {
  const tw = wetBulb(tempC, humidityPct);
  // 0.7 wet-bulb + 0.3 dry-bulb (no black globe — shade/overcast assumption)
  return Math.round((0.7 * tw + 0.3 * tempC) * 10) / 10;
}

// US Army wind chill formula (below 10°C, wind > 5 kph)
function calcWindChill(tempC: number, windKph: number): number {
  if (tempC >= 10 || windKph < 5) return tempC;
  return Math.round(
    (13.12 + 0.6215 * tempC - 11.37 * Math.pow(windKph, 0.16) + 0.3965 * tempC * Math.pow(windKph, 0.16)) * 10,
  ) / 10;
}

// Barometric altitude model: O2 availability relative to sea level
function calcOxygenPct(altitudeM: number): number {
  return Math.round(Math.exp(-altitudeM / 7400) * 100);
}

// US Army FM 21-10 terrain energy-cost multipliers
const TERRAIN_MULTIPLIERS: Record<EnvironmentProfile['terrain'], number> = {
  road: 1.0,
  trail: 1.15,
  hills: 1.28,
  mud: 1.38,
  snow: 1.32,
  sand: 1.52,
};

function wbgtRisk(wbgt: number): MissionRisk {
  if (wbgt < 28) return 'Green';
  if (wbgt < 32) return 'Amber';
  if (wbgt < 35) return 'Red';
  return 'Black';
}

function heatPacePenalty(wbgt: number): number {
  // % pace reduction per WBGT degree above 25°C
  if (wbgt <= 25) return 0;
  return Math.min(40, Math.round((wbgt - 25) * 3));
}

function coldPacePenalty(windChillC: number): number {
  if (windChillC >= 0) return 0;
  return Math.min(25, Math.round(Math.abs(windChillC) * 1.5));
}

function altitudePacePenalty(oxygenPct: number): number {
  return Math.round((100 - oxygenPct) * 0.8);
}

export function calcMissionAdjustments(
  profile: EnvironmentProfile,
  loadKg = 0,
): MissionAdjustments {
  const wbgt = calcWBGT(profile.tempCelsius, profile.humidityPct);
  const windChillC = calcWindChill(profile.tempCelsius, profile.windKph);
  const oxygenPct = calcOxygenPct(profile.altitudeM);
  const riskLevel = wbgtRisk(wbgt);
  const terrainMultiplier = TERRAIN_MULTIPLIERS[profile.terrain];

  const heatPenalty = heatPacePenalty(wbgt);
  const coldPenalty = coldPacePenalty(windChillC);
  const altPenalty = altitudePacePenalty(oxygenPct);
  const terrainPenalty = Math.round((terrainMultiplier - 1) * 100);
  const paceAdjustmentPct = Math.min(65, heatPenalty + coldPenalty + altPenalty + terrainPenalty);

  const loadCaps: Record<MissionRisk, number> = {
    Green: 35,
    Amber: 25,
    Red: 15,
    Black: 0,
  };
  const loadCapKg = loadCaps[riskLevel];

  // Hydration: base 500ml/hr + heat addition + load addition + terrain
  const heatExtra = Math.max(0, (wbgt - 25) * 40);
  const loadExtra = Math.max(0, (loadKg - 10) / 5) * 80;
  const terrainExtra = profile.terrain === 'sand' || profile.terrain === 'mud' ? 80 : 0;
  const hydrationMlPerHour = Math.min(1400, Math.round(500 + heatExtra + loadExtra + terrainExtra));

  // 350mg sodium per 500ml consumed (US Army guidance)
  const electrolyteMgPerHour = Math.round((hydrationMlPerHour / 500) * 350);

  const warnings: string[] = [];
  if (riskLevel === 'Black') warnings.push('Training suspended — Black WBGT. Heat casualty risk critical.');
  if (riskLevel === 'Red') warnings.push('Red WBGT: mandatory 10-min rest per 20-min effort.');
  if (riskLevel === 'Amber') warnings.push('Amber WBGT: reduce intensity by 25%, increase water intake.');
  if (oxygenPct < 80) warnings.push(`Altitude hypoxia risk — O₂ at ${oxygenPct}%. Acclimatise 48h before load efforts.`);
  if (oxygenPct < 90 && oxygenPct >= 80) warnings.push(`Reduced O₂ (${oxygenPct}%) — lower target heart rate by 5–10 bpm.`);
  if (windChillC < -20) warnings.push('Extreme cold: exposed skin freezes in < 10 min. Full coverage required.');
  if (windChillC < -10) warnings.push('High cold-weather injury risk. Layer up, check extremities every 15 min.');
  if (loadKg > loadCapKg && loadCapKg > 0) warnings.push(`Load ${loadKg}kg exceeds ${riskLevel} condition cap of ${loadCapKg}kg.`);
  if (profile.terrain === 'sand') warnings.push('Sand terrain: high blister and ankle strain risk. Gaiters recommended.');

  return {
    wbgt,
    windChillC,
    oxygenPct,
    riskLevel,
    paceAdjustmentPct,
    loadCapKg,
    hydrationMlPerHour,
    electrolyteMgPerHour,
    terrainMultiplier,
    warnings,
  };
}
