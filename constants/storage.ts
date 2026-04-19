import AsyncStorage from '@react-native-async-storage/async-storage';
import { Routine, ROUTINES, WorkoutLog, WORKOUT_HISTORY } from './mockData';
import {
  PointsStore,
  WorkoutPointsEntry,
  DEFAULT_POINTS_HISTORY,
  DEFAULT_TOTAL_POINTS,
} from './points';
import {
  syncProfileToSupabase,
  syncRoutinesToSupabase,
  syncScheduleToSupabase,
  syncPointsToSupabase,
  syncWorkoutLogToSupabase,
} from '@/lib/sync';

// ─── Profile ─────────────────────────────────────────────────────────────────

export type ProfileData = {
  name: string;
  goal: string;
  age: string;
  weight: string;
  height: string;
  pictureUri: string | null;
};

const PROFILE_KEY = '@workout_tracker:profile';

const DEFAULT_PROFILE: ProfileData = {
  name: '',
  goal: 'Build Muscle',
  age: '',
  weight: '',
  height: '',
  pictureUri: null,
};

export async function loadProfile(): Promise<ProfileData> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (raw === null) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: ProfileData, userId?: string): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  if (userId) syncProfileToSupabase(userId, profile);
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export type ScheduleEntry = {
  day: string;
  routineId: string | null;
};

const SCHEDULE_KEY = '@workout_tracker:schedule';

const DEFAULT_SCHEDULE: ScheduleEntry[] = [
  { day: 'Monday',    routineId: null },
  { day: 'Tuesday',   routineId: null },
  { day: 'Wednesday', routineId: null },
  { day: 'Thursday',  routineId: null },
  { day: 'Friday',    routineId: null },
  { day: 'Saturday',  routineId: null },
  { day: 'Sunday',    routineId: null },
];

export async function loadSchedule(): Promise<ScheduleEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_KEY);
    if (raw === null) return DEFAULT_SCHEDULE;
    return JSON.parse(raw) as ScheduleEntry[];
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export async function saveSchedule(schedule: ScheduleEntry[], userId?: string): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  if (userId) syncScheduleToSupabase(userId, schedule);
}

// ─── Points ───────────────────────────────────────────────────────────────────

const POINTS_KEY = '@workout_tracker:points';

const DEFAULT_POINTS: PointsStore = {
  totalPoints: 0,
  history: [],
};

export async function loadPoints(): Promise<PointsStore> {
  try {
    const raw = await AsyncStorage.getItem(POINTS_KEY);
    if (raw === null) return DEFAULT_POINTS;
    return JSON.parse(raw) as PointsStore;
  } catch {
    return DEFAULT_POINTS;
  }
}

export async function savePoints(store: PointsStore, userId?: string): Promise<void> {
  await AsyncStorage.setItem(POINTS_KEY, JSON.stringify(store));
  if (userId) syncPointsToSupabase(userId, store.totalPoints, store.history);
}

export async function addWorkoutPoints(entry: WorkoutPointsEntry, userId?: string): Promise<void> {
  const store = await loadPoints();
  const filtered = store.history.filter((e) => e.workoutId !== entry.workoutId);
  const updated: PointsStore = {
    totalPoints: filtered.reduce((s, e) => s + e.total, 0) + entry.total,
    history: [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date)),
  };
  await savePoints(updated, userId);
}

// ─── Routines ────────────────────────────────────────────────────────────────

const ROUTINES_KEY = '@workout_tracker:routines';

export async function loadRoutines(): Promise<Routine[]> {
  try {
    const raw = await AsyncStorage.getItem(ROUTINES_KEY);
    if (raw === null) return [];
    return JSON.parse(raw) as Routine[];
  } catch {
    return [];
  }
}

export async function saveRoutines(routines: Routine[], userId?: string): Promise<void> {
  await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
  if (userId) syncRoutinesToSupabase(userId, routines);
}

export async function upsertRoutine(routine: Routine, userId?: string): Promise<void> {
  const existing = await loadRoutines();
  const idx = existing.findIndex((r) => r.id === routine.id);
  const updated =
    idx >= 0
      ? existing.map((r) => (r.id === routine.id ? routine : r))
      : [...existing, routine];
  await saveRoutines(updated, userId);
}

export async function deleteRoutine(id: string, userId?: string): Promise<void> {
  const existing = await loadRoutines();
  await saveRoutines(existing.filter((r) => r.id !== id), userId);
}

// ─── Workout History ──────────────────────────────────────────────────────────

const WORKOUT_HISTORY_KEY = '@workout_tracker:workout_history';

export async function loadWorkoutHistory(): Promise<WorkoutLog[]> {
  try {
    const raw = await AsyncStorage.getItem(WORKOUT_HISTORY_KEY);
    if (raw === null) return [];
    return JSON.parse(raw) as WorkoutLog[];
  } catch {
    return [];
  }
}

export async function saveWorkoutLog(log: WorkoutLog, userId?: string): Promise<void> {
  const existing = await loadWorkoutHistory();
  const filtered = existing.filter((w) => w.id !== log.id);
  await AsyncStorage.setItem(
    WORKOUT_HISTORY_KEY,
    JSON.stringify([...filtered, log])
  );
  if (userId) syncWorkoutLogToSupabase(userId, log);
}
