import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { WORKOUT_DAYS, WORKOUT_HISTORY, WorkoutLog } from '@/constants/mockData';

// ─── Constants ────────────────────────────────────────────────────────────────

const YEAR = 2026;
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
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

// ─── Workout Detail Modal ─────────────────────────────────────────────────────

function WorkoutDetailModal({
  log,
  onClose,
}: {
  log: WorkoutLog | null;
  onClose: () => void;
}) {
  if (!log) return null;

  return (
    <Modal visible animationType="slide" transparent>
      <View style={styles.detailOverlay}>
        <TouchableOpacity style={styles.detailBg} activeOpacity={1} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.detailHeader}>
            <View>
              <Text style={styles.detailName}>{log.name}</Text>
              <Text style={styles.detailMeta}>
                {log.dateLabel} · {log.duration}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Exercise list */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailBody}
          >
            {log.exercises.map((ex, ei) => (
              <View key={ei} style={styles.exBlock}>
                <Text style={styles.exName}>{ex.name}</Text>
                {/* Column headers */}
                <View style={styles.setHeader}>
                  <Text style={[styles.setHeaderCell, { width: 28 }]}>SET</Text>
                  <Text style={[styles.setHeaderCell, { flex: 1 }]}>WEIGHT</Text>
                  <Text style={[styles.setHeaderCell, { flex: 1 }]}>REPS</Text>
                </View>
                {ex.sets.map((s, si) => (
                  <View key={si} style={styles.setRow}>
                    <Text style={[styles.setNum, { width: 28 }]}>{si + 1}</Text>
                    <Text style={[styles.setValue, { flex: 1 }]}>
                      {s.weight === 'BW' ? 'BW' : `${s.weight} lbs`}
                    </Text>
                    <Text style={[styles.setValue, { flex: 1 }]}>{s.reps}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Month Calendar ───────────────────────────────────────────────────────────

function MemoryMonthCalendar({
  year,
  month,
  today,
  historyMap,
  onDayPress,
}: {
  year: number;
  month: number;
  today: Date;
  historyMap: Map<string, WorkoutLog>;
  onDayPress: (log: WorkoutLog | null, key: string) => void;
}) {
  const weeks = useMemo(() => buildCalendarGrid(year, month), [year, month]);

  const workoutCount = useMemo(() => {
    let n = 0;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      if (WORKOUT_DAYS.has(dateKey(year, month, d))) n++;
    }
    return n;
  }, [year, month]);

  const isFuture =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month > today.getMonth());

  if (workoutCount === 0 && isFuture) return null;

  return (
    <View style={[styles.monthCard, isFuture && styles.monthCardFuture]}>
      <View style={styles.monthHeader}>
        <Text style={[styles.monthName, isFuture && styles.monthNameFuture]}>
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

            const key = dateKey(year, month, day);
            const isWorkout = WORKOUT_DAYS.has(key);
            const hasDetail = historyMap.has(key);
            const isFutureDay = new Date(year, month, day) > today;
            const isToday =
              year === today.getFullYear() &&
              month === today.getMonth() &&
              day === today.getDate();

            return (
              <TouchableOpacity
                key={di}
                style={styles.dayCell}
                onPress={() => {
                  if (isWorkout) onDayPress(historyMap.get(key) ?? null, key);
                }}
                activeOpacity={isWorkout ? 0.7 : 1}
                disabled={!isWorkout}
              >
                <View
                  style={[
                    styles.dayInner,
                    isWorkout && styles.dayWorkout,
                    isToday && !isWorkout && styles.dayToday,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      isWorkout && styles.dayTextWorkout,
                      isFutureDay && styles.dayTextFuture,
                      isToday && !isWorkout && styles.dayTextToday,
                    ]}
                  >
                    {day}
                  </Text>
                  {hasDetail && (
                    <View style={styles.detailDot} />
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

// ─── Memories Screen ──────────────────────────────────────────────────────────

export default function MemoriesScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const [selectedLog, setSelectedLog] = useState<WorkoutLog | null>(null);
  const [detailVisible, setDetailVisible] = useState(false);

  // Build a date-key → WorkoutLog lookup from history
  const historyMap = useMemo(() => {
    const map = new Map<string, WorkoutLog>();
    for (const log of WORKOUT_HISTORY) {
      map.set(log.date, log);
    }
    return map;
  }, []);

  const totalWorkouts = WORKOUT_DAYS.size;

  function handleDayPress(log: WorkoutLog | null, key: string) {
    if (log) {
      setSelectedLog(log);
      setDetailVisible(true);
    }
  }

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
        <Text style={styles.headerTitle}>Memories</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Banner */}
        <View style={styles.banner}>
          <View style={styles.bannerIcon}>
            <Ionicons name="images" size={22} color={Colors.accent} />
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>{totalWorkouts} workouts logged</Text>
            <Text style={styles.bannerSub}>Tap a highlighted day to relive it</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.accent }]} />
            <Text style={styles.legendText}>Workout</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: Colors.accent }]}>
              <View style={styles.legendDetailDot} />
            </View>
            <Text style={styles.legendText}>+ Details saved</Text>
          </View>
        </View>

        {/* Monthly calendars */}
        {Array.from({ length: 12 }, (_, i) => i).map((month) => (
          <MemoryMonthCalendar
            key={month}
            year={YEAR}
            month={month}
            today={today}
            historyMap={historyMap}
            onDayPress={handleDayPress}
          />
        ))}
      </ScrollView>

      {detailVisible && (
        <WorkoutDetailModal
          log={selectedLog}
          onClose={() => { setDetailVisible(false); setSelectedLog(null); }}
        />
      )}
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

  // Banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerText: {
    gap: 2,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bannerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  // Legend
  legend: {
    flexDirection: 'row',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDetailDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#fff',
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
    opacity: 0.4,
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
  dayTextFuture: {
    color: Colors.border,
  },
  dayTextToday: {
    color: Colors.accent,
    fontWeight: '700',
  },
  detailDot: {
    position: 'absolute',
    bottom: 2,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },

  // Workout detail modal
  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  detailBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  detailSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  detailName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  detailMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  detailBody: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  exBlock: {
    gap: 8,
  },
  exName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  setHeader: {
    flexDirection: 'row',
    gap: 8,
  },
  setHeaderCell: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  setNum: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: 'center',
    fontWeight: '600',
  },
  setValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    textAlign: 'center',
    fontWeight: '500',
  },
});
