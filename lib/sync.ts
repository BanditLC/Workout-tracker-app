import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabase';
import type { Routine, WorkoutLog } from '@/constants/mockData';
import type { WorkoutPointsEntry } from '@/constants/points';
import type { ProfileData, ScheduleEntry } from '@/constants/storage';

const PROFILE_KEY = '@workout_tracker:profile';
const SCHEDULE_KEY = '@workout_tracker:schedule';
const POINTS_KEY = '@workout_tracker:points';
const ROUTINES_KEY = '@workout_tracker:routines';
const WORKOUT_HISTORY_KEY = '@workout_tracker:workout_history';

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function syncProfileToSupabase(userId: string, profile: ProfileData) {
  try {
    await getSupabase().from('profiles').upsert({
      id: userId,
      name: profile.name,
      goal: profile.goal,
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      picture_url: profile.pictureUri,
      updated_at: new Date().toISOString(),
    });
  } catch {}
}

export async function fetchProfileFromSupabase(userId: string): Promise<ProfileData | null> {
  try {
    const { data } = await getSupabase()
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (!data) return null;
    return {
      name: data.name,
      goal: data.goal,
      age: data.age,
      weight: data.weight,
      height: data.height,
      pictureUri: data.picture_url,
    };
  } catch {
    return null;
  }
}

// ─── Routines ────────────────────────────────────────────────────────────────

export async function syncRoutinesToSupabase(userId: string, routines: Routine[]) {
  try {
    await getSupabase().from('routines').delete().eq('user_id', userId);
    if (routines.length > 0) {
      await getSupabase().from('routines').upsert(
        routines.map((r) => ({
          id: r.id,
          user_id: userId,
          name: r.name,
          tag: r.tag,
          exercises: r.exercises,
          updated_at: new Date().toISOString(),
        })),
        { onConflict: 'id,user_id' }
      );
    }
  } catch {}
}

export async function fetchRoutinesFromSupabase(userId: string): Promise<Routine[] | null> {
  try {
    const { data } = await getSupabase()
      .from('routines')
      .select('*')
      .eq('user_id', userId)
      .order('created_at');
    if (!data) return null;
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      tag: r.tag,
      exercises: r.exercises as Routine['exercises'],
    }));
  } catch {
    return null;
  }
}

// ─── Schedule ────────────────────────────────────────────────────────────────

export async function syncScheduleToSupabase(userId: string, schedule: ScheduleEntry[]) {
  try {
    await getSupabase().from('schedules').delete().eq('user_id', userId);
    if (schedule.length > 0) {
      await getSupabase().from('schedules').upsert(
        schedule.map((s) => ({
          user_id: userId,
          day: s.day,
          routine_id: s.routineId,
        })),
        { onConflict: 'user_id,day' }
      );
    }
  } catch {}
}

export async function fetchScheduleFromSupabase(userId: string): Promise<ScheduleEntry[] | null> {
  try {
    const { data } = await getSupabase()
      .from('schedules')
      .select('*')
      .eq('user_id', userId);
    if (!data || data.length === 0) return null;
    return data.map((s) => ({
      day: s.day,
      routineId: s.routine_id,
    }));
  } catch {
    return null;
  }
}

// ─── Workout History ─────────────────────────────────────────────────────────

export async function syncWorkoutLogToSupabase(userId: string, log: WorkoutLog) {
  try {
    await getSupabase().from('workout_logs').upsert(
      {
        id: log.id,
        user_id: userId,
        name: log.name,
        date: log.date,
        date_label: log.dateLabel,
        duration: log.duration,
        exercises: log.exercises,
      },
      { onConflict: 'id,user_id' }
    );
  } catch {}
}

export async function syncAllWorkoutLogsToSupabase(userId: string, logs: WorkoutLog[]) {
  try {
    await getSupabase().from('workout_logs').delete().eq('user_id', userId);
    if (logs.length > 0) {
      await getSupabase().from('workout_logs').upsert(
        logs.map((log) => ({
          id: log.id,
          user_id: userId,
          name: log.name,
          date: log.date,
          date_label: log.dateLabel,
          duration: log.duration,
          exercises: log.exercises,
        })),
        { onConflict: 'id,user_id' }
      );
    }
  } catch {}
}

export async function fetchWorkoutHistoryFromSupabase(userId: string): Promise<WorkoutLog[] | null> {
  try {
    const { data } = await getSupabase()
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: true });
    if (!data) return null;
    return data.map((w) => ({
      id: w.id,
      name: w.name,
      date: w.date,
      dateLabel: w.date_label,
      duration: w.duration,
      exercises: w.exercises as WorkoutLog['exercises'],
    }));
  } catch {
    return null;
  }
}

// ─── Points ──────────────────────────────────────────────────────────────────

export async function syncPointsToSupabase(
  userId: string,
  totalPoints: number,
  history: WorkoutPointsEntry[]
) {
  try {
    await getSupabase().from('points').upsert({
      user_id: userId,
      total_points: totalPoints,
      updated_at: new Date().toISOString(),
    });

    await getSupabase().from('points_history').delete().eq('user_id', userId);
    if (history.length > 0) {
      await getSupabase().from('points_history').upsert(
        history.map((e) => ({
          workout_id: e.workoutId,
          user_id: userId,
          date: e.date,
          workout_name: e.workoutName,
          volume_points: e.volumePoints,
          improvement_bonus: e.improvementBonus,
          streak_bonus: e.streakBonus,
          consistency_bonus: e.consistencyBonus,
          total: e.total,
          improvements: e.improvements,
          volume: e.volume,
          streak_days: e.streakDays,
        })),
        { onConflict: 'workout_id,user_id' }
      );
    }
  } catch {}
}

export async function fetchPointsFromSupabase(
  userId: string
): Promise<{ totalPoints: number; history: WorkoutPointsEntry[] } | null> {
  try {
    const [{ data: pts }, { data: hist }] = await Promise.all([
      getSupabase().from('points').select('*').eq('user_id', userId).single(),
      getSupabase()
        .from('points_history')
        .select('*')
        .eq('user_id', userId)
        .order('date'),
    ]);
    if (!pts) return null;
    return {
      totalPoints: pts.total_points,
      history: (hist ?? []).map((e) => ({
        workoutId: e.workout_id,
        date: e.date,
        workoutName: e.workout_name,
        volumePoints: e.volume_points,
        improvementBonus: e.improvement_bonus,
        streakBonus: e.streak_bonus,
        consistencyBonus: e.consistency_bonus,
        total: e.total,
        improvements: e.improvements as string[],
        volume: e.volume,
        streakDays: e.streak_days,
      })),
    };
  } catch {
    return null;
  }
}

// ─── Full Sync (pull from Supabase → AsyncStorage) ──────────────────────────

export async function fullSyncFromSupabase(userId: string): Promise<void> {
  const [profile, routines, schedule, history, points] = await Promise.all([
    fetchProfileFromSupabase(userId),
    fetchRoutinesFromSupabase(userId),
    fetchScheduleFromSupabase(userId),
    fetchWorkoutHistoryFromSupabase(userId),
    fetchPointsFromSupabase(userId),
  ]);

  const writes: Promise<void>[] = [];

  if (profile) {
    writes.push(AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile)));
  }
  if (routines) {
    writes.push(AsyncStorage.setItem(ROUTINES_KEY, JSON.stringify(routines)));
  }
  if (schedule) {
    writes.push(AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule)));
  }
  if (history) {
    writes.push(AsyncStorage.setItem(WORKOUT_HISTORY_KEY, JSON.stringify(history)));
  }
  if (points) {
    writes.push(AsyncStorage.setItem(POINTS_KEY, JSON.stringify(points)));
  }

  await Promise.all(writes);
}

// ─── Push local data to Supabase (one-time migration) ────────────────────────

export async function pushLocalDataToSupabase(userId: string): Promise<void> {
  const [profileRaw, routinesRaw, scheduleRaw, historyRaw, pointsRaw] = await Promise.all([
    AsyncStorage.getItem(PROFILE_KEY),
    AsyncStorage.getItem(ROUTINES_KEY),
    AsyncStorage.getItem(SCHEDULE_KEY),
    AsyncStorage.getItem(WORKOUT_HISTORY_KEY),
    AsyncStorage.getItem(POINTS_KEY),
  ]);

  const ops: Promise<unknown>[] = [];

  if (profileRaw) {
    const profile = JSON.parse(profileRaw) as ProfileData;
    ops.push(syncProfileToSupabase(userId, profile));
  }
  if (routinesRaw) {
    const routines = JSON.parse(routinesRaw) as Routine[];
    ops.push(syncRoutinesToSupabase(userId, routines));
  }
  if (scheduleRaw) {
    const schedule = JSON.parse(scheduleRaw) as ScheduleEntry[];
    ops.push(syncScheduleToSupabase(userId, schedule));
  }
  if (historyRaw) {
    const history = JSON.parse(historyRaw) as WorkoutLog[];
    ops.push(syncAllWorkoutLogsToSupabase(userId, history));
  }
  if (pointsRaw) {
    const points = JSON.parse(pointsRaw) as { totalPoints: number; history: WorkoutPointsEntry[] };
    ops.push(syncPointsToSupabase(userId, points.totalPoints, points.history));
  }

  await Promise.all(ops);
}
