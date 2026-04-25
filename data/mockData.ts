export type TrainingSession = {
  id: string;
  type: 'Ruck' | 'Strength' | 'Run' | 'Mobility';
  title: string;
  score: number;
  durationMinutes: number;
  rpe: number;
  date?: number;
  loadKg?: number;
  heartRateBpm?: number;
  cognitiveScore?: number;
  avgReactionMs?: number;
  cognitiveResults?: CognitiveResult[];
};

export type CognitiveTaskKind =
  | 'reaction'
  | 'shoot-noshoot'
  | 'memory'
  | 'pattern'
  | 'decision';

export type CognitiveResult = {
  taskKind: CognitiveTaskKind;
  reactionMs?: number;
  correct?: boolean;
  fatigueBpm?: number;
  sessionId: string;
  timestamp: number;
};

export type EnvironmentProfile = {
  tempCelsius: number;
  humidityPct: number;
  altitudeM: number;
  terrain: 'road' | 'trail' | 'sand' | 'mud' | 'hills' | 'snow';
  windKph: number;
};

export type SquadMember = {
  id: string;
  name: string;
  readiness: number;
  compliance: number;
  risk: 'Low' | 'Medium' | 'High';
};

const DAY = 86400000;
const now = Date.now();

export const initialSessions: TrainingSession[] = [
  { id: '1', type: 'Ruck',     title: 'Loaded Intervals',    score: 88, durationMinutes: 45, rpe: 7, loadKg: 18, heartRateBpm: 148, date: now - 2 * DAY },
  { id: '2', type: 'Strength', title: 'Lower Body Strength', score: 81, durationMinutes: 52, rpe: 8,             heartRateBpm: 162, date: now - 4 * DAY },
  { id: '3', type: 'Run',      title: 'Zone 2 Run',          score: 76, durationMinutes: 38, rpe: 5,             heartRateBpm: 138, date: now - 6 * DAY },
];

export const squadMembers: SquadMember[] = [
  { id: '1', name: 'Cpl Ryan', readiness: 86, compliance: 92, risk: 'Low' },
  { id: '2', name: 'Pte Doyle', readiness: 61, compliance: 67, risk: 'Medium' },
  { id: '3', name: 'Pte Walsh', readiness: 44, compliance: 58, risk: 'High' },
  { id: '4', name: 'Sgt Murphy', readiness: 79, compliance: 84, risk: 'Low' },
];
