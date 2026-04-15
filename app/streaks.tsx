import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { WORKOUT_DAYS } from '@/constants/mockData';

// ─── Types ────────────────────────────────────────────────────────────────────

type DayType = 'workout' | 'rest' | 'missed' | 'future' | 'empty';

type StreakRun = {
  startLabel: string;
  endLabel: string;
  workouts: number;
  days: number; // calendar span
};

// ─── Constants ────────────────────────────────────────────────────────────────

const CURRENT_STREAK = 12;
const BEST_STREAK = 21;
const YEAR = 2026;

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${(month + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
}

function buildCalendarGrid(year: number, month: number): (number | null)[][] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/**
 * Compute streak periods from workout days.
 * A gap of ≤ 2 calendar days (i.e. one rest day) keeps a streak alive.
 */
function computeStreakRuns(workoutDays: Set<string>): StreakRun[] {
  const sorted = Array.from(workoutDays)
    .sort()
    .map((d) => new Date(d + 'T12:00:00'));

  if (sorted.length === 0) return [];

  const runs: StreakRun[] = [];
  let start = sorted[0];
  let end = sorted[0];
  let count = 1;

  for (let i = 1; i < sorted.length; i++) {
    const diff =
      (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
    if (diff <= 2) {
      end = sorted[i];
      count++;
    } else {
      runs.push({
        startLabel: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        endLabel: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        workouts: count,
        days: Math.round(
          (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1,
      });
      start = sorted[i];
      end = sorted[i];
      count = 1;
    }
  }
  runs.push({
    startLabel: start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    endLabel: end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    workouts: count,
    days: Math.round(
      (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
    ) + 1,
  });

  return runs.reverse(); // most recent first
}

/**
 * Determine the display type for a given calendar day.
 * Days within a streak-period but without a logged workout = 'rest'.
 * Past days outside any streak period = 'missed'.
 * Future days = 'future' (shown dimly, no workout markers).
 */
function getDayType(
  year: number,
  month: number,
  day: number,
  periods: Array<{ startMs: number; endMs: number }>,
  today: Date
): DayType {
  const date = new Date(year, month, day);
  if (date > today) return 'future';

  const key = dateKey(year, month, day);
  if (WORKOUT_DAYS.has(key)) return 'workout';

  const ms = date.getTime();
  const inPeriod = periods.some((p) => ms >= p.startMs && ms <= p.endMs);
  return inPeriod ? 'rest' : 'missed';
}

// ─── Month Calendar ───────────────────────────────────────────────────────────

function MonthCalendar({
  year,
  month,
  periods,
  today,
}: {
  year: number;
  month: number;
  periods: Array<{ startMs: number; endMs: number }>;
  today: Date;
}) {
  const weeks = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const workoutCount = useMemo(() => {
    const isFuture =
      year > today.getFullYear() ||
      (year === today.getFullYear() && month > today.getMonth());
    if (isFuture) return 0;
    let n = 0;
    const days = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= days; d++) {
      if (WORKOUT_DAYS.has(dateKey(year, month, d))) n++;
    }
    return n;
  }, [year, month, today]);

  const isFutureMonth =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth());

  return (
    <View style={[styles.monthCard, isFutureMonth && styles.monthCardFuture]}>
      <View style={styles.monthHeader}>
        <Text style={[styles.monthName, isFutureMonth && styles.monthNameFuture]}>
          {MONTHS[month]}
        </Text>
        {workoutCount > 0 && (
          <View style={styles.monthBadge}>
            <Text style={styles.monthBadgeText}>{workoutCount} workouts</Text>
          </View>
        )}
      </View>

      <View style={styles.dayLabelsRow}>
        {DAY_LABELS.map((d, i) => (
          <Text key={i} style={styles.dayLabel}>{d}</Text>
        ))}
      </View>

      {weeks.map((week, wi) => (
        <View key={wi} style={styles.week}>
          {week.map((day, di) => {
            if (!day) return <View key={di} style={styles.dayCell} />;

            const type = getDayType(year, month, day, periods, today);
            const isToday =
              year === today.getFullYear() &&
              month === today.getMonth() &&
              day === today.getDate();

            return (
              <View key={di} style={styles.dayCell}>
                <View
                  style={[
                    styles.dayInner,
                    type === 'workout' && styles.dayWorkout,
                    type === 'rest' && styles.dayRest,
                    type === 'missed' && styles.dayMissed,
                    isToday && type !== 'workout' && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      type === 'workout' && styles.dayTextWorkout,
                      type === 'rest' && styles.dayTextRest,
                      type === 'missed' && styles.dayTextMissed,
                      type === 'future' && styles.dayTextFuture,
                      isToday && type !== 'workout' && styles.dayTextToday,
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
    </View>
  );
}

// ─── Streaks Screen ───────────────────────────────────────────────────────────

export default function StreaksScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const streakRuns = useMemo(() => computeStreakRuns(WORKOUT_DAYS), []);

  // Pre-compute period start/end as ms for fast day-type lookup
  const periods = useMemo(() => {
    const sorted = Array.from(WORKOUT_DAYS)
      .sort()
      .map((d) => new Date(d + 'T12:00:00'));
    if (sorted.length === 0) return [];

    const result: Array<{ startMs: number; endMs: number }> = [];
    let start = sorted[0];
    let end = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const diff =
        (sorted[i].getTime() - sorted[i - 1].getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 2) {
        end = sorted[i];
      } else {
        result.push({ startMs: start.getTime(), endMs: end.getTime() });
        start = sorted[i];
        end = sorted[i];
      }
    }
    result.push({ startMs: start.getTime(), endMs: end.getTime() });
    return result;
  }, []);

  const months = useMemo(
    () => Array.from({ length: 12 }, (_, i) => i),
    []
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Streaks</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Current streak hero ─────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroLeft}>
            <Text style={styles.heroFlame}>🔥</Text>
            <View>
              <Text style={styles.heroLabel}>Current Streak</Text>
              <Text style={styles.heroCount}>
                {CURRENT_STREAK}
                <Text style={styles.heroUnit}> days</Text>
              </Text>
            </View>
          </View>
          <View style={styles.heroDivider} />
          <View style={styles.heroRight}>
            <Text style={styles.bestLabel}>Best Streak</Text>
            <Text style={styles.bestCount}>
              {BEST_STREAK}
              <Text style={styles.bestUnit}> days</Text>
            </Text>
          </View>
        </View>

        {/* ── Streak runs this year ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>All Streaks — {YEAR}</Text>
        {streakRuns.map((run, i) => (
          <View key={i} style={styles.runCard}>
            <View style={styles.runFlameBox}>
              <Text style={styles.runFlame}>🔥</Text>
            </View>
            <View style={styles.runInfo}>
              <Text style={styles.runDates}>
                {run.startLabel}
                {run.startLabel !== run.endLabel ? ` – ${run.endLabel}` : ''}
              </Text>
              <Text style={styles.runMeta}>
                {run.workouts} workout{run.workouts !== 1 ? 's' : ''} · {run.days} day span
              </Text>
            </View>
            <View style={styles.runBadge}>
              <Text style={styles.runBadgeText}>{run.workouts}</Text>
              <Text style={styles.runBadgeUnit}>sessions</Text>
            </View>
          </View>
        ))}

        {/* ── Monthly calendars ────────────────────────────────────────── */}
        <View style={styles.monthlyHeader}>
          <Text style={styles.sectionTitle}>Monthly Breakdown</Text>
          {/* Shared legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendWorkout]} />
              <Text style={styles.legendText}>Workout</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendRest]} />
              <Text style={styles.legendText}>Rest</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendMissed]} />
              <Text style={styles.legendText}>Missed</Text>
            </View>
          </View>
        </View>

        {months.map((month) => (
          <MonthCalendar
            key={month}
            year={YEAR}
            month={month}
            periods={periods}
            today={today}
          />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // Hero card
  heroCard: {
    backgroundColor: Colors.accent,
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  heroLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  heroFlame: {
    fontSize: 36,
  },
  heroLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  heroCount: {
    fontSize: 42,
    fontWeight: '800',
    color: '#fff',
    lineHeight: 46,
  },
  heroUnit: {
    fontSize: 18,
    fontWeight: '600',
  },
  heroDivider: {
    width: 1,
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 16,
  },
  heroRight: {
    alignItems: 'center',
    gap: 4,
  },
  bestLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  bestCount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
  },
  bestUnit: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Section title
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },

  // Streak run cards
  runCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  runFlameBox: {
    width: 42,
    height: 42,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runFlame: {
    fontSize: 22,
  },
  runInfo: {
    flex: 1,
    gap: 3,
  },
  runDates: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  runMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  runBadge: {
    alignItems: 'center',
    gap: 1,
  },
  runBadgeText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  runBadgeUnit: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },

  // Monthly breakdown header + legend
  monthlyHeader: {
    gap: 10,
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendWorkout: {
    backgroundColor: Colors.accent,
  },
  legendRest: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  legendMissed: {
    backgroundColor: 'rgba(229,57,53,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(229,57,53,0.3)',
  },
  legendText: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Month card
  monthCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
  },
  monthCardFuture: {
    opacity: 0.45,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  monthName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  monthNameFuture: {
    color: Colors.textMuted,
  },
  monthBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  monthBadgeText: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '600',
  },
  dayLabelsRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
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
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayWorkout: {
    backgroundColor: Colors.accent,
  },
  dayRest: {
    backgroundColor: Colors.surfaceElevated,
  },
  dayMissed: {
    backgroundColor: 'rgba(229,57,53,0.1)',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  dayText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayTextWorkout: {
    color: '#fff',
    fontWeight: '700',
  },
  dayTextRest: {
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  dayTextMissed: {
    color: Colors.textMuted,
  },
  dayTextFuture: {
    color: Colors.border,
  },
  dayTextToday: {
    color: Colors.accent,
    fontWeight: '700',
  },
});
