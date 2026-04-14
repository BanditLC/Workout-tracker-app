// ─── Shared types ────────────────────────────────────────────────────────────

export type RoutineExercise = {
  id: string;    // references EXERCISE_LIBRARY
  name: string;
  sets: number;
  reps: string;  // target reps, e.g. "8" or "8-12"
};

export type Routine = {
  id: string;
  name: string;
  tag: string;   // e.g. "Chest · Shoulders · Triceps"
  exercises: RoutineExercise[];
};

export type WorkoutSet = {
  weight: string;
  reps: string;
};

export type WorkoutExercise = {
  id: string;
  name: string;
  sets: WorkoutSet[];
};

export type WorkoutLog = {
  id: string;
  name: string;
  date: string;       // 'YYYY-MM-DD'
  dateLabel: string;  // Human-readable display label
  duration: string;
  exercises: WorkoutExercise[];
};

export type ExerciseInfo = {
  id: string;
  name: string;
  muscleGroup: string;
};

// ─── Exercise library ─────────────────────────────────────────────────────────

export const EXERCISE_LIBRARY: ExerciseInfo[] = [
  // Chest
  { id: 'bench_press', name: 'Bench Press', muscleGroup: 'Chest' },
  { id: 'incline_bench', name: 'Incline Bench Press', muscleGroup: 'Chest' },
  { id: 'decline_bench', name: 'Decline Bench Press', muscleGroup: 'Chest' },
  { id: 'incline_db', name: 'Incline Dumbbell Press', muscleGroup: 'Chest' },
  { id: 'cable_fly', name: 'Cable Fly', muscleGroup: 'Chest' },
  { id: 'pec_deck', name: 'Pec Deck', muscleGroup: 'Chest' },
  // Back
  { id: 'deadlift', name: 'Deadlift', muscleGroup: 'Back' },
  { id: 'pull_up', name: 'Pull Up', muscleGroup: 'Back' },
  { id: 'barbell_row', name: 'Barbell Row', muscleGroup: 'Back' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', muscleGroup: 'Back' },
  { id: 'seated_row', name: 'Seated Cable Row', muscleGroup: 'Back' },
  { id: 'tbar_row', name: 'T-Bar Row', muscleGroup: 'Back' },
  // Legs
  { id: 'squat', name: 'Squat', muscleGroup: 'Legs' },
  { id: 'leg_press', name: 'Leg Press', muscleGroup: 'Legs' },
  { id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs' },
  { id: 'leg_curl', name: 'Leg Curl', muscleGroup: 'Legs' },
  { id: 'leg_ext', name: 'Leg Extension', muscleGroup: 'Legs' },
  { id: 'lunge', name: 'Lunge', muscleGroup: 'Legs' },
  { id: 'calf_raise', name: 'Calf Raise', muscleGroup: 'Legs' },
  // Shoulders
  { id: 'ohp', name: 'Overhead Press', muscleGroup: 'Shoulders' },
  { id: 'lat_raise', name: 'Lateral Raise', muscleGroup: 'Shoulders' },
  { id: 'front_raise', name: 'Front Raise', muscleGroup: 'Shoulders' },
  { id: 'face_pull', name: 'Face Pull', muscleGroup: 'Shoulders' },
  { id: 'arnold_press', name: 'Arnold Press', muscleGroup: 'Shoulders' },
  // Biceps
  { id: 'barbell_curl', name: 'Barbell Curl', muscleGroup: 'Biceps' },
  { id: 'hammer_curl', name: 'Hammer Curl', muscleGroup: 'Biceps' },
  { id: 'incline_curl', name: 'Incline Dumbbell Curl', muscleGroup: 'Biceps' },
  { id: 'preacher_curl', name: 'Preacher Curl', muscleGroup: 'Biceps' },
  // Triceps
  { id: 'tricep_push', name: 'Tricep Pushdown', muscleGroup: 'Triceps' },
  { id: 'skull_crusher', name: 'Skull Crusher', muscleGroup: 'Triceps' },
  { id: 'overhead_ext', name: 'Overhead Tricep Extension', muscleGroup: 'Triceps' },
  { id: 'close_grip', name: 'Close Grip Bench Press', muscleGroup: 'Triceps' },
  // Core
  { id: 'plank', name: 'Plank', muscleGroup: 'Core' },
  { id: 'crunch', name: 'Crunch', muscleGroup: 'Core' },
  { id: 'ab_wheel', name: 'Ab Wheel Rollout', muscleGroup: 'Core' },
  { id: 'hanging_leg', name: 'Hanging Leg Raise', muscleGroup: 'Core' },
];

// ─── Previous performance (shown in log screen PREV column) ──────────────────

export const PREV_PERFORMANCE: Record<string, string> = {
  bench_press: '185 × 8',
  incline_bench: '155 × 10',
  decline_bench: '165 × 8',
  incline_db: '60 × 12',
  cable_fly: '40 × 15',
  pec_deck: '100 × 12',
  deadlift: '315 × 5',
  pull_up: 'BW × 10',
  barbell_row: '155 × 10',
  lat_pulldown: '150 × 12',
  seated_row: '160 × 12',
  tbar_row: '135 × 10',
  squat: '225 × 8',
  leg_press: '360 × 12',
  rdl: '225 × 10',
  leg_curl: '130 × 12',
  leg_ext: '140 × 12',
  lunge: '95 × 10',
  calf_raise: '180 × 15',
  ohp: '115 × 10',
  lat_raise: '20 × 15',
  front_raise: '25 × 12',
  face_pull: '60 × 15',
  arnold_press: '45 × 10',
  barbell_curl: '95 × 10',
  hammer_curl: '40 × 12',
  incline_curl: '30 × 12',
  preacher_curl: '65 × 10',
  tricep_push: '60 × 12',
  skull_crusher: '85 × 10',
  overhead_ext: '70 × 12',
  close_grip: '155 × 8',
  plank: 'BW × 60s',
  crunch: 'BW × 20',
  ab_wheel: 'BW × 12',
  hanging_leg: 'BW × 12',
};

// ─── Workout history ──────────────────────────────────────────────────────────

export const WORKOUT_HISTORY: WorkoutLog[] = [
  {
    id: '1',
    name: 'Upper Body Push',
    date: '2026-04-13',
    dateLabel: 'Today',
    duration: '52 min',
    exercises: [
      {
        id: 'bench_press', name: 'Bench Press',
        sets: [
          { weight: '185', reps: '8' }, { weight: '185', reps: '8' },
          { weight: '185', reps: '7' }, { weight: '185', reps: '6' },
        ],
      },
      {
        id: 'ohp', name: 'Overhead Press',
        sets: [
          { weight: '115', reps: '10' }, { weight: '115', reps: '9' },
          { weight: '115', reps: '8' },
        ],
      },
      {
        id: 'incline_db', name: 'Incline Dumbbell Press',
        sets: [
          { weight: '60', reps: '12' }, { weight: '60', reps: '11' },
          { weight: '60', reps: '10' },
        ],
      },
      {
        id: 'lat_raise', name: 'Lateral Raise',
        sets: [
          { weight: '20', reps: '15' }, { weight: '20', reps: '15' },
          { weight: '20', reps: '12' },
        ],
      },
    ],
  },
  {
    id: '2',
    name: 'Leg Day',
    date: '2026-04-12',
    dateLabel: 'Yesterday',
    duration: '48 min',
    exercises: [
      {
        id: 'squat', name: 'Squat',
        sets: [
          { weight: '225', reps: '8' }, { weight: '225', reps: '7' },
          { weight: '225', reps: '6' }, { weight: '205', reps: '8' },
        ],
      },
      {
        id: 'leg_press', name: 'Leg Press',
        sets: [
          { weight: '360', reps: '12' }, { weight: '360', reps: '12' },
          { weight: '360', reps: '10' },
        ],
      },
      {
        id: 'leg_curl', name: 'Leg Curl',
        sets: [
          { weight: '130', reps: '12' }, { weight: '130', reps: '10' },
          { weight: '130', reps: '10' },
        ],
      },
      {
        id: 'calf_raise', name: 'Calf Raise',
        sets: [
          { weight: '180', reps: '15' }, { weight: '180', reps: '15' },
          { weight: '180', reps: '12' },
        ],
      },
    ],
  },
  {
    id: '3',
    name: 'Pull Day',
    date: '2026-04-11',
    dateLabel: 'Apr 11',
    duration: '44 min',
    exercises: [
      {
        id: 'deadlift', name: 'Deadlift',
        sets: [
          { weight: '315', reps: '5' }, { weight: '315', reps: '5' },
          { weight: '315', reps: '4' },
        ],
      },
      {
        id: 'pull_up', name: 'Pull Up',
        sets: [
          { weight: 'BW', reps: '10' }, { weight: 'BW', reps: '9' },
          { weight: 'BW', reps: '8' },
        ],
      },
      {
        id: 'lat_pulldown', name: 'Lat Pulldown',
        sets: [
          { weight: '150', reps: '12' }, { weight: '150', reps: '11' },
          { weight: '150', reps: '10' },
        ],
      },
      {
        id: 'barbell_curl', name: 'Barbell Curl',
        sets: [
          { weight: '95', reps: '10' }, { weight: '95', reps: '9' },
          { weight: '85', reps: '10' },
        ],
      },
    ],
  },
  {
    id: '4',
    name: 'Full Body',
    date: '2026-04-10',
    dateLabel: 'Apr 10',
    duration: '60 min',
    exercises: [
      {
        id: 'squat', name: 'Squat',
        sets: [
          { weight: '225', reps: '6' }, { weight: '225', reps: '6' },
          { weight: '205', reps: '8' },
        ],
      },
      {
        id: 'bench_press', name: 'Bench Press',
        sets: [
          { weight: '185', reps: '8' }, { weight: '185', reps: '7' },
          { weight: '175', reps: '8' },
        ],
      },
      {
        id: 'barbell_row', name: 'Barbell Row',
        sets: [
          { weight: '155', reps: '10' }, { weight: '155', reps: '9' },
          { weight: '155', reps: '9' },
        ],
      },
      {
        id: 'ohp', name: 'Overhead Press',
        sets: [
          { weight: '105', reps: '10' }, { weight: '105', reps: '9' },
        ],
      },
    ],
  },
];

// ─── Saved routines ──────────────────────────────────────────────────────────

export const ROUTINES: Routine[] = [
  {
    id: 'r1',
    name: 'Upper Body Push',
    tag: 'Chest · Shoulders · Triceps',
    exercises: [
      { id: 'bench_press', name: 'Bench Press', sets: 4, reps: '8' },
      { id: 'ohp', name: 'Overhead Press', sets: 3, reps: '10' },
      { id: 'incline_db', name: 'Incline Dumbbell Press', sets: 3, reps: '12' },
      { id: 'lat_raise', name: 'Lateral Raise', sets: 3, reps: '15' },
      { id: 'tricep_push', name: 'Tricep Pushdown', sets: 3, reps: '12' },
    ],
  },
  {
    id: 'r2',
    name: 'Leg Day',
    tag: 'Quads · Hamstrings · Calves',
    exercises: [
      { id: 'squat', name: 'Squat', sets: 4, reps: '8' },
      { id: 'leg_press', name: 'Leg Press', sets: 3, reps: '12' },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 3, reps: '10' },
      { id: 'leg_curl', name: 'Leg Curl', sets: 3, reps: '12' },
      { id: 'calf_raise', name: 'Calf Raise', sets: 4, reps: '15' },
    ],
  },
  {
    id: 'r3',
    name: 'Pull Day',
    tag: 'Back · Biceps',
    exercises: [
      { id: 'deadlift', name: 'Deadlift', sets: 3, reps: '5' },
      { id: 'pull_up', name: 'Pull Up', sets: 3, reps: '10' },
      { id: 'lat_pulldown', name: 'Lat Pulldown', sets: 3, reps: '12' },
      { id: 'seated_row', name: 'Seated Cable Row', sets: 3, reps: '12' },
      { id: 'barbell_curl', name: 'Barbell Curl', sets: 3, reps: '10' },
    ],
  },
  {
    id: 'r4',
    name: 'Full Body',
    tag: 'Compound · All Muscle Groups',
    exercises: [
      { id: 'squat', name: 'Squat', sets: 3, reps: '6' },
      { id: 'bench_press', name: 'Bench Press', sets: 3, reps: '8' },
      { id: 'barbell_row', name: 'Barbell Row', sets: 3, reps: '10' },
      { id: 'ohp', name: 'Overhead Press', sets: 2, reps: '10' },
      { id: 'rdl', name: 'Romanian Deadlift', sets: 3, reps: '10' },
    ],
  },
];

// ─── Days that have workouts logged ──────────────────────────────────────────

export const WORKOUT_DAYS = new Set([
  '2026-04-13', '2026-04-12', '2026-04-11', '2026-04-10',
  '2026-04-08', '2026-04-07', '2026-04-06',
  '2026-04-04', '2026-04-03', '2026-04-02', '2026-04-01',
  '2026-03-30', '2026-03-28', '2026-03-27',
  '2026-03-25', '2026-03-24', '2026-03-22', '2026-03-21',
  '2026-03-19', '2026-03-18', '2026-03-17',
]);
