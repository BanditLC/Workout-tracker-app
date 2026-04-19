import AsyncStorage from '@react-native-async-storage/async-storage';
import { Routine, ROUTINES, WorkoutLog, WORKOUT_HISTORY } from './mockData';
import {
  PointsStore,
  WorkoutPointsEntry,
  DEFAULT_POINTS_HISTORY,
  DEFAULT_TOTAL_POINTS,
} from './points';

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
  name: 'Liam',
  goal: 'Build Muscle',
  age: '22',
  weight: '175',
  height: `5'11"`,
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

export async function saveProfile(profile: ProfileData): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

export type ScheduleEntry = {
  day: string;   // 'Monday' … 'Sunday'
  routineId: string | null; // null = rest day
};

const SCHEDULE_KEY = '@workout_tracker:schedule';

const DEFAULT_SCHEDULE: ScheduleEntry[] = [
  { day: 'Monday',    routineId: 'r1' },
  { day: 'Tuesday',   routineId: 'r2' },
  { day: 'Wednesday', routineId: null },
  { day: 'Thursday',  routineId: 'r3' },
  { day: 'Friday',    routineId: 'r1' },
  { day: 'Saturday',  routineId: 'r4' },
  { day: 'Sunday',    routineId: null },
];

export async function loadSchedule(): Promise<ScheduleEntry[]> {
  try {
    const raw = await AsyncStorage.getItem(SCHEDULE_KEY);
    if (raw === null) {
      await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(DEFAULT_SCHEDULE));
      return DEFAULT_SCHEDULE;
    }
    return JSON.parse(raw) as ScheduleEntry[];
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

export async function saveSchedule(schedule: ScheduleEntry[]): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
}

// ─── Points ───────────────────────────────────────────────────────────────────

const POINTS_KEY = '@workout_tracker:points';

const DEFAULT_POINTS: PointsStore = {
  totalPoints: DEFAULT_TOTAL_POINTS,
  history: DEFAULT_POINTS_HISTORY,
};

export async function loadPoints(): Promise<PointsStore> {
  try {
    const raw = await AsyncStorage.getItem(POINTS_KEY);
    if (raw === null) {
      await AsyncStorage.setItem(POINTS_KEY, JSON.stringify(DEFAULT_POINTS));
      return DEFAULT_POINTS;
    }
    return JSON.parse(raw) as PointsStore;
  } catch {
    return DEFAULT_POINTS;
  }
}

export async function savePoints(store: PointsStore): Promise<void> {
  await AsyncStorage.setItem(POINTS_KEY, JSON.stringify(store));
}

export async function addWorkoutPoints(entry: WorkoutPointsEntry): Promise<void> {
  const store = await loadPoints();
  // Avoid duplicate entries for the same workoutId
  const filtered = store.history.filter((e) => e.workoutId !== entry.workoutId);
  const updated: PointsStore = {
    totalPoints: filtered.reduce((s, e) => s + e.total, 0) + entry.total,
    history: [...filtered, entry].sort((a, b) => a.date.localeCompare(b.date)),
  };
  await savePoints(updated);
}

const ROUTINES_KEY = '@workout_tracker:routines';

/**
 * Load routines from AsyncStorage.
 * First launch: seeds from ROUTINES mock data.
 */
export async function loadRoutines(): Promise<Routine[]> {
  try {
    const raw = await AsyncStorage.getItem(ROUTINES_KEY);
    if (raw === null) {
      await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(ROUTINES));
      return ROUTINES;
    }
    return JSON.parse(raw) as Routine[];
  } catch {
    return ROUTINES;
  }
}

/** Persist the full routines array. */
export async function saveRoutines(routines: Routine[]): Promise<void> {
  await AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines));
}

/** Insert a new routine or replace an existing one by id. */
export async function upsertRoutine(routine: Routine): Promise<void> {
  const existing = await loadRoutines();
  const idx = existing.findIndex((r) => r.id === routine.id);
  const updated =
    idx >= 0
      ? existing.map((r) => (r.id === routine.id ? routine : r))
      : [...existing, routine];
  await saveRoutines(updated);
}

/** Remove a routine by id. */
export async function deleteRoutine(id: string): Promise<void> {
  const existing = await loadRoutines();
  await saveRoutines(existing.filter((r) => r.id !== id));
}

// ─── Workout History ──────────────────────────────────────────────────────────

const WORKOUT_HISTORY_KEY = '@workout_tracker:workout_history';

/**
 * Load workout history from AsyncStorage.
 * First launch: seeds from WORKOUT_HISTORY mock data.
 */
export async function loadWorkoutHistory(): Promise<WorkoutLog[]> {
  try {
    const raw = await AsyncStorage.getItem(WORKOUT_HISTORY_KEY);
    if (raw === null) {
      await AsyncStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(WORKOUT_HISTORY));
      return WORKOUT_HISTORY;
    }
    return JSON.parse(raw) as WorkoutLog[];
  } catch {
    return WORKOUT_HISTORY;
  }
}

/** Append (or replace) a completed workout in storage. */
export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const existing = await loadWorkoutHistory();
  const filtered = existing.filter((w) => w.id !== log.id);
  await AsyncStorage.setItem(
    WORKOUT_HISTORY_KEY,
    JSON.stringify([...filtered, log])
  );
}
