import AsyncStorage from '@react-native-async-storage/async-storage';
import { Routine, ROUTINES } from './mockData';
import {
  PointsStore,
  WorkoutPointsEntry,
  DEFAULT_POINTS_HISTORY,
  DEFAULT_TOTAL_POINTS,
} from './points';

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
