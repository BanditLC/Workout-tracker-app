import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { WORKOUT_DAYS, ROUTINES, Routine } from '@/constants/mockData';
import { loadRoutines, loadPoints, loadProfile } from '@/constants/storage';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';

// ─── Constants ────────────────────────────────────────────────────────────────

const STREAK = 12;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Streak Calendar ──────────────────────────────────────────────────────────

function StreakCalendar() {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  const weeks = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: (number | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    const result: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) result.push(cells.slice(i, i + 7));
    return result;
  }, [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  // Count workout days in the current view
  const workoutDaysThisMonth = weeks
    .flat()
    .filter((d) => {
      if (!d) return false;
      const key = `${viewYear}-${(viewMonth + 1).toString().padStart(2, '0')}-${d.toString().padStart(2, '0')}`;
      return WORKOUT_DAYS.has(key);
    }).length;

  return (
    <View style={calStyles.container}>
      {/* Month nav */}
      <View style={calStyles.header}>
        <TouchableOpacity
          onPress={prevMonth}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <View style={calStyles.headerCenter}>
          <Text style={calStyles.monthText}>
            {MONTHS[viewMonth]} {viewYear}
          </Text>
          <Text style={calStyles.monthCount}>
            {workoutDaysThisMonth} workout{workoutDaysThisMonth !== 1 ? 's' : ''}
          </Text>
        </View>
        <TouchableOpacity
          onPress={nextMonth}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <Ionicons name="chevron-forward" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Day-of-week labels */}
      <View style={calStyles.dayLabelsRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={calStyles.dayLabel}>{d}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, wi) => (
        <View key={wi} style={calStyles.week}>
          {week.map((day, di) => {
            if (!day) {
              return <View key={di} style={calStyles.dayCell} />;
            }
            const mm = (viewMonth + 1).toString().padStart(2, '0');
            const dd = day.toString().padStart(2, '0');
            const dateKey = `${viewYear}-${mm}-${dd}`;
            const hasWorkout = WORKOUT_DAYS.has(dateKey);
            const isToday =
              viewYear === today.getFullYear() &&
              viewMonth === today.getMonth() &&
              day === today.getDate();

            return (
              <View key={di} style={calStyles.dayCell}>
                <View
                  style={[
                    calStyles.dayInner,
                    hasWorkout && calStyles.dayWorkout,
                    isToday && !hasWorkout && calStyles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      calStyles.dayText,
                      hasWorkout && calStyles.dayTextWorkout,
                      isToday && !hasWorkout && calStyles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ))}

      {/* Legend */}
      <View style={calStyles.legend}>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { backgroundColor: Colors.accent }]} />
          <Text style={calStyles.legendText}>Workout logged</Text>
        </View>
        <View style={calStyles.legendItem}>
          <View style={[calStyles.legendDot, { borderWidth: 1.5, borderColor: Colors.accent }]} />
          <Text style={calStyles.legendText}>Today</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Routine Card ────────────────────────────────────────────────────────────

function RoutineCard({ routine }: { routine: Routine }) {
  const router = useRouter();
  const totalSets = routine.exercises.reduce((a, ex) => a + ex.sets, 0);

  return (
    <View style={styles.routineCard}>
      <View style={styles.routineCardInfo}>
        <Text style={styles.routineCardName}>{routine.name}</Text>
        <Text style={styles.routineCardTag}>
          {routine.exercises.length} exercises · {totalSets} sets
        </Text>
        <Text style={styles.routineCardTag}>{routine.tag}</Text>
      </View>
      <View style={styles.routineCardActions}>
        <TouchableOpacity
          style={styles.routineStartBtn}
          onPress={() =>
            router.push({ pathname: '/(tabs)/log', params: { routineId: routine.id } })
          }
        >
          <Ionicons name="play" size={14} color="#fff" />
          <Text style={styles.routineStartText}>Start</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.routineEditBtn}
          onPress={() =>
            router.push({ pathname: '/routine/[id]', params: { id: routine.id } })
          }
        >
          <Ionicons name="create-outline" size={14} color={Colors.accent} />
          <Text style={styles.routineEditText}>Edit</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Home Screen ──────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [routines, setRoutines] = useState<Routine[]>(ROUTINES);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pictureUri, setPictureUri] = useState<string | null>(null);

  const fetchAvatar = useCallback(async () => {
    if (!user?.id) {
      setPictureUri(null);
      return;
    }
    const filePath = `${user.id}/profile.jpg`;
    const { data: files } = await getSupabase().storage.from('avatars').list(user.id, { limit: 1, search: 'profile.jpg' });
    if (files && files.length > 0) {
      const { data } = getSupabase().storage.from('avatars').getPublicUrl(filePath);
      setPictureUri(`${data.publicUrl}?t=${Date.now()}`);
    } else {
      setPictureUri(null);
    }
  }, [user?.id]);

  useEffect(() => {
    setPictureUri(null);
    loadRoutines().then(setRoutines);
    loadPoints().then((p) => setTotalPoints(p.totalPoints));
    fetchAvatar();
  }, [user?.id, fetchAvatar]);

  useFocusEffect(
    useCallback(() => {
      loadRoutines().then(setRoutines);
      loadPoints().then((p) => setTotalPoints(p.totalPoints));
      fetchAvatar();
    }, [user?.id])
  );

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting}</Text>
            <Text style={styles.headerTitle}>Ready to grind?</Text>
          </View>
          <TouchableOpacity style={styles.avatarButton} onPress={() => router.push('/(tabs)/profile')}>
            {pictureUri ? (
              <Image source={{ uri: pictureUri }} style={styles.avatarImage} />
            ) : (
              <Ionicons
                name="person-circle-outline"
                size={38}
                color={Colors.textSecondary}
              />
            )}
          </TouchableOpacity>
        </View>

        {/* ── Streak card (taps to full Streaks page) ─────────────── */}
        <TouchableOpacity
          style={styles.streakCard}
          activeOpacity={0.85}
          onPress={() => router.push('/streaks')}
        >
          <View style={styles.streakLeft}>
            <View style={styles.streakIconWrapper}>
              <Text style={styles.streakFlame}>🔥</Text>
            </View>
            <View style={styles.streakTextBlock}>
              <Text style={styles.streakLabel}>Current Streak</Text>
              <Text style={styles.streakCount}>
                {STREAK} <Text style={styles.streakUnit}>days</Text>
              </Text>
            </View>
          </View>
          <View style={styles.streakBadge}>
            <Text style={styles.streakBadgeText}>ON FIRE</Text>
          </View>
        </TouchableOpacity>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="barbell-outline" size={20} color={Colors.accent} />
            <Text style={styles.statValue}>47</Text>
            <Text style={styles.statLabel}>Workouts</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Ionicons name="time-outline" size={20} color={Colors.accent} />
            <Text style={styles.statValue}>3.2h</Text>
            <Text style={styles.statLabel}>This week</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statCard}>
            <Ionicons name="star-outline" size={20} color={Colors.accent} />
            <Text style={styles.statValue}>{totalPoints.toLocaleString()}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
        </View>

        {/* ── Streak calendar ─────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Streak Calendar</Text>
        </View>
        <StreakCalendar />

        {/* ── Workouts ─────────────────────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Workouts</Text>
        </View>

        {/* Action row */}
        <View style={styles.workoutActionRow}>
          <TouchableOpacity
            style={styles.emptyWorkoutBtn}
            activeOpacity={0.85}
            onPress={() => router.push('/(tabs)/log')}
          >
            <Ionicons name="play-circle" size={20} color="#fff" />
            <Text style={styles.emptyWorkoutText}>Start Empty</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.createRoutineBtn}
            activeOpacity={0.85}
            onPress={() => router.push({ pathname: '/routine/[id]', params: { id: 'new' } })}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
            <Text style={styles.createRoutineText}>New Routine</Text>
          </TouchableOpacity>
        </View>

        {/* Saved routines */}
        <Text style={styles.routinesLabel}>My Routines</Text>
        {routines.map((routine) => (
          <RoutineCard key={routine.id} routine={routine} />
        ))}

        {/* ── Quick Actions ────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { marginTop: 4 }]}>Quick Actions</Text>
        <View style={styles.quickActions}>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/schedule')}
          >
            <Ionicons name="calendar-outline" size={26} color={Colors.accent} />
            <Text style={styles.quickLabel}>Schedule</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.quickCard}
            onPress={() => router.push('/prs')}
          >
            <Ionicons name="trophy-outline" size={26} color={Colors.accent} />
            <Text style={styles.quickLabel}>PRs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Calendar styles ──────────────────────────────────────────────────────────

const calStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  headerCenter: {
    alignItems: 'center',
    gap: 2,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  monthCount: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  week: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 3,
  },
  dayInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayWorkout: {
    backgroundColor: Colors.accent,
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  dayText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayTextWorkout: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextToday: {
    color: Colors.accent,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: 20,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 14,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 2,
  },
  avatarButton: {
    padding: 4,
  },
  avatarImage: {
    width: 38,
    height: 38,
    borderRadius: 19,
  },

  // Streak card
  streakCard: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  streakLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  streakIconWrapper: {
    width: 52,
    height: 52,
    backgroundColor: 'rgba(0,0,0,0.15)',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakFlame: { fontSize: 28 },
  streakTextBlock: { gap: 2 },
  streakLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  streakCount: {
    fontSize: 36,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 40,
  },
  streakUnit: {
    fontSize: 18,
    fontWeight: '600',
  },
  streakBadge: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  streakBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    marginBottom: 28,
    paddingVertical: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  sectionAction: {
    fontSize: 14,
    color: Colors.accent,
    fontWeight: '600',
  },

  // Workouts section
  workoutActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  emptyWorkoutBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyWorkoutText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  createRoutineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  createRoutineText: {
    color: Colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  routinesLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  routineCardInfo: {
    flex: 1,
    gap: 3,
  },
  routineCardName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  routineCardTag: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  routineCardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  routineStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  routineStartText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  routineEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  routineEditText: {
    color: Colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
});
