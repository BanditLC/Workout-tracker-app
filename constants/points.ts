// ─── Types ────────────────────────────────────────────────────────────────────

export type WorkoutPointsEntry = {
  workoutId: string;
  date: string;           // 'YYYY-MM-DD'
  workoutName: string;
  volumePoints: number;
  improvementBonus: number;
  streakBonus: number;
  consistencyBonus: number;
  total: number;
  improvements: string[]; // e.g. ['Bench Press: 185 → 190 lbs']
  volume: number;         // total lbs lifted (excluding BW)
  streakDays: number;     // streak at time of workout
};

export type PointsStore = {
  totalPoints: number;
  history: WorkoutPointsEntry[];
};

// ─── Scoring constants ────────────────────────────────────────────────────────

/** 1 point per 100 lbs of total volume (weight × reps across all completed sets) */
export const POINTS_PER_100_LBS = 1;

/** Bonus points per exercise where the best set beats the previous performance */
export const IMPROVEMENT_BONUS_PER_PR = 25;

/**
 * Streak multiplier per consecutive workout day applied to (volumePoints + improvementBonus).
 * e.g. a 10-day streak gives a 50% bonus (capped).
 */
export const STREAK_BONUS_PER_DAY = 0.05;

/** Maximum streak multiplier (reached at 10+ consecutive days) */
export const MAX_STREAK_MULTIPLIER = 0.5;

/** Bonus for finishing a workout on the exact day it was scheduled */
export const CONSISTENCY_BONUS = 50;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Shape of a prior workout used for improvement detection. */
type PriorWorkout = {
  exercises: Array<{
    id: string;
    sets: Array<{ weight: string; reps: string }>;
  }>;
};

/**
 * Find the all-time best set for an exercise across prior workouts.
 * Returns null if the exercise has never been logged.
 */
function getBestFromHistory(
  exerciseId: string,
  priorWorkouts: PriorWorkout[]
): { weight: number; reps: number } | null {
  let bestW = 0, bestR = 0;
  for (const workout of priorWorkouts) {
    for (const ex of workout.exercises) {
      if (ex.id !== exerciseId) continue;
      for (const set of ex.sets) {
        const w = parseFloat(set.weight);
        const r = parseInt(set.reps, 10);
        if (!isNaN(w) && !isNaN(r) && w > 0) {
          if (w > bestW || (w === bestW && r > bestR)) { bestW = w; bestR = r; }
        }
      }
    }
  }
  return bestW > 0 ? { weight: bestW, reps: bestR } : null;
}

/**
 * Fallback: parse PREV_PERFORMANCE strings like "185 × 8" or "BW × 10s".
 * Returns null for bodyweight entries.
 */
function parsePrev(prev: string): { weight: number; reps: number } | null {
  if (!prev || prev.startsWith('BW')) return null;
  const [wPart, rPart] = prev.split('×').map((s) => s.trim());
  const weight = parseFloat(wPart);
  const reps = parseInt(rPart, 10);
  if (isNaN(weight) || isNaN(reps)) return null;
  return { weight, reps };
}

// ─── Main calculation function ────────────────────────────────────────────────

export type PointsCalcInput = {
  workoutId: string;
  date: string;
  workoutName: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: Array<{ weight: string; reps: string; completed: boolean }>;
  }>;
  /** Static fallback for exercises not yet in workout history. */
  prevPerformance: Record<string, string>;
  /**
   * Real workout history (prior workouts only, not including the current one).
   * Used first for improvement detection; prevPerformance is the fallback.
   */
  priorWorkouts: PriorWorkout[];
  currentStreak: number;
  isScheduledToday: boolean;
};

export function calculateWorkoutPoints(input: PointsCalcInput): WorkoutPointsEntry {
  const {
    workoutId, date, workoutName,
    exercises, prevPerformance, priorWorkouts,
    currentStreak, isScheduledToday,
  } = input;

  // ── Volume points ───────────────────────────────────────────────────────
  let volume = 0;
  for (const ex of exercises) {
    for (const set of ex.sets) {
      if (!set.completed) continue;
      const w = parseFloat(set.weight);
      const r = parseInt(set.reps, 10);
      if (!isNaN(w) && !isNaN(r) && w > 0) volume += w * r;
    }
  }
  const volumePoints = Math.floor(volume / 100) * POINTS_PER_100_LBS;

  // ── Improvement bonus ───────────────────────────────────────────────────
  // Prefer real history for prior-best; fall back to static PREV_PERFORMANCE strings.
  const improvements: string[] = [];
  for (const ex of exercises) {
    const prevParsed =
      getBestFromHistory(ex.id, priorWorkouts) ??
      parsePrev(prevPerformance[ex.id] ?? '');
    if (!prevParsed) continue;

    // Best completed set for this exercise in the current workout
    let bestW = 0, bestR = 0;
    for (const set of ex.sets) {
      if (!set.completed) continue;
      const w = parseFloat(set.weight);
      const r = parseInt(set.reps, 10);
      if (isNaN(w) || isNaN(r) || w <= 0) continue;
      if (w > bestW || (w === bestW && r > bestR)) { bestW = w; bestR = r; }
    }
    if (bestW === 0) continue;

    if (bestW > prevParsed.weight) {
      improvements.push(`${ex.name}: ${prevParsed.weight} → ${bestW} lbs`);
    } else if (bestW === prevParsed.weight && bestR > prevParsed.reps) {
      improvements.push(`${ex.name}: ${prevParsed.reps} → ${bestR} reps @ ${bestW} lbs`);
    }
  }
  const improvementBonus = improvements.length * IMPROVEMENT_BONUS_PER_PR;

  // ── Streak bonus ────────────────────────────────────────────────────────
  const multiplier = Math.min(currentStreak * STREAK_BONUS_PER_DAY, MAX_STREAK_MULTIPLIER);
  const streakBonus = Math.floor((volumePoints + improvementBonus) * multiplier);

  // ── Consistency bonus ───────────────────────────────────────────────────
  const consistencyBonus = isScheduledToday ? CONSISTENCY_BONUS : 0;

  const total = volumePoints + improvementBonus + streakBonus + consistencyBonus;

  return {
    workoutId, date, workoutName,
    volumePoints, improvementBonus, streakBonus, consistencyBonus,
    total, improvements,
    volume: Math.round(volume),
    streakDays: currentStreak,
  };
}

// ─── Streak helper ────────────────────────────────────────────────────────────

/**
 * Compute the current workout streak as of today (including today's workout
 * being logged right now). Uses WORKOUT_DAYS with a 1-rest-day grace period.
 */
export function computeCurrentStreak(workoutDays: Set<string>): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function key(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  let streak = 1; // today counts
  let gapAllowed = 1;
  const check = new Date(today);
  check.setDate(check.getDate() - 1);

  for (let i = 0; i < 365; i++) {
    if (workoutDays.has(key(check))) {
      streak++;
      gapAllowed = 1; // reset
    } else if (gapAllowed > 0) {
      gapAllowed--;   // burn a gap
    } else {
      break;
    }
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

// ─── Pre-seeded points history ────────────────────────────────────────────────
// Derived from WORKOUT_HISTORY entries. Values calculated from actual set data.
//
// TODO: Level / rank system would be computed here from totalPoints, e.g.:
//   Beginner  0–499 pts  | Intermediate 500–1999 pts
//   Advanced  2000–4999  | Elite 5000+
//   Unlocking a new rank could trigger a celebration modal.

export const DEFAULT_POINTS_HISTORY: WorkoutPointsEntry[] = [
  {
    workoutId: '5', date: '2026-03-21', workoutName: 'Upper Body Push',
    volumePoints: 119, improvementBonus: 0, streakBonus: 29, consistencyBonus: 0,
    total: 148, improvements: [], volume: 11980, streakDays: 5,
  },
  {
    workoutId: '6', date: '2026-03-27', workoutName: 'Pull Day',
    volumePoints: 149, improvementBonus: 0, streakBonus: 67, consistencyBonus: 0,
    total: 216, improvements: [], volume: 14952, streakDays: 9,
  },
  {
    workoutId: '7', date: '2026-04-03', workoutName: 'Leg Day',
    volumePoints: 356, improvementBonus: 0, streakBonus: 178, consistencyBonus: 0,
    total: 534, improvements: [], volume: 35675, streakDays: 14,
  },
  {
    workoutId: '8', date: '2026-04-08', workoutName: 'Upper Body Push',
    volumePoints: 153, improvementBonus: 0, streakBonus: 76, consistencyBonus: 0,
    total: 229, improvements: [], volume: 15358, streakDays: 19,
  },
  {
    workoutId: '4', date: '2026-04-10', workoutName: 'Full Body',
    volumePoints: 148, improvementBonus: 0, streakBonus: 74, consistencyBonus: 0,
    total: 222, improvements: [], volume: 14850, streakDays: 21,
  },
  {
    workoutId: '3', date: '2026-04-11', workoutName: 'Pull Day',
    volumePoints: 120, improvementBonus: 0, streakBonus: 60, consistencyBonus: 0,
    total: 180, improvements: [], volume: 12015, streakDays: 22,
  },
  {
    workoutId: '2', date: '2026-04-12', workoutName: 'Leg Day',
    volumePoints: 303, improvementBonus: 0, streakBonus: 151, consistencyBonus: 0,
    total: 454, improvements: [], volume: 30325, streakDays: 23,
  },
  {
    workoutId: '1', date: '2026-04-13', workoutName: 'Upper Body Push',
    volumePoints: 112, improvementBonus: 0, streakBonus: 56, consistencyBonus: 50,
    total: 218, improvements: [], volume: 11290, streakDays: 24,
  },
];

export const DEFAULT_TOTAL_POINTS = DEFAULT_POINTS_HISTORY.reduce(
  (sum, e) => sum + e.total, 0
); // 2,201
