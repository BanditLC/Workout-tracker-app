import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { WORKOUT_DAYS, WORKOUT_HISTORY, PR_HISTORY } from '@/constants/mockData';
import { loadPoints } from '@/constants/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type DayStatus = 'workout' | 'missed' | 'today' | 'future';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  copy.setDate(copy.getDate() - (day === 0 ? 6 : day - 1));
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

// ─── Week Strip ───────────────────────────────────────────────────────────────

const WEEK_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function WeekStrip({ today }: { today: Date }) {
  const days = useMemo(() => {
    const monday = getMonday(today);
    const todayKey = dateKey(today);
    return WEEK_LETTERS.map((letter, i) => {
      const date = addDays(monday, i);
      const key = dateKey(date);
      const isToday = key === todayKey;
      let status: DayStatus;
      if (date > today && !isToday) status = 'future';
      else if (WORKOUT_DAYS.has(key)) status = 'workout';
      else if (isToday) status = 'today';
      else status = 'missed';
      return { letter, dayNum: date.getDate(), status, isToday };
    });
  }, [today]);

  return (
    <View style={styles.weekStrip}>
      {days.map((d, i) => (
        <View key={i} style={styles.weekDayCol}>
          <Text style={styles.weekLetter}>{d.letter}</Text>
          <View
            style={[
              styles.weekDot,
              d.status === 'workout' && styles.weekDotWorkout,
              d.status === 'missed' && styles.weekDotMissed,
              d.isToday && d.status !== 'workout' && styles.weekDotToday,
            ]}
          >
            {d.status === 'workout' ? (
              <Ionicons name="checkmark" size={13} color="#fff" />
            ) : (
              <Text
                style={[
                  styles.weekDayNum,
                  d.status === 'future' && styles.weekNumFuture,
                  d.status === 'missed' && styles.weekNumMissed,
                  d.isToday && styles.weekNumToday,
                ]}
              >
                {d.dayNum}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── Shared chart primitives ──────────────────────────────────────────────────

const CHART_H = 72;

function BarChart({
  bars,
  maxValue,
  formatValue,
  formatLabel,
}: {
  bars: { value: number; label: string; isCurrent: boolean }[];
  maxValue: number;
  formatValue: (v: number) => string;
  formatLabel: (label: string, i: number) => string;
}) {
  return (
    <View style={styles.chart}>
      <View style={styles.chartBars}>
        {bars.map((bar, i) => (
          <View key={i} style={styles.chartCol}>
            <View style={[styles.chartTrack, { height: CHART_H }]}>
              {bar.value > 0 && (
                <View
                  style={[
                    styles.chartFill,
                    {
                      height: Math.max((bar.value / maxValue) * CHART_H, 6),
                      backgroundColor: bar.isCurrent ? Colors.accent : Colors.surfaceElevated,
                    },
                  ]}
                />
              )}
            </View>
            {bar.value > 0 && (
              <Text style={[styles.chartCount, bar.isCurrent && { color: Colors.accent }]}>
                {formatValue(bar.value)}
              </Text>
            )}
          </View>
        ))}
      </View>
      <View style={styles.chartAxis}>
        {bars.map((bar, i) => (
          <Text key={i} style={[styles.chartAxisLabel, bar.isCurrent && { color: Colors.accent }]}>
            {formatLabel(bar.label, i)}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ─── Frequency Chart ──────────────────────────────────────────────────────────

function FrequencyChart({ today }: { today: Date }) {
  const bars = useMemo(() => {
    const monday = getMonday(today);
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = addDays(monday, -(7 - i) * 7);
      let count = 0;
      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        if (day > today) break;
        if (WORKOUT_DAYS.has(dateKey(day))) count++;
      }
      return {
        value: count,
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isCurrent: i === 7,
      };
    });
  }, [today]);

  const maxValue = useMemo(() => Math.max(...bars.map((b) => b.value), 1), [bars]);

  return (
    <BarChart
      bars={bars}
      maxValue={maxValue}
      formatValue={(v) => String(v)}
      formatLabel={(label, i) => (i % 2 === 1 ? label.split(' ')[1] : '')}
    />
  );
}

// ─── Volume Chart ─────────────────────────────────────────────────────────────

function VolumeChart({ today }: { today: Date }) {
  const bars = useMemo(() => {
    const monday = getMonday(today);
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = addDays(monday, -(7 - i) * 7);
      const weekEnd = addDays(weekStart, 6);
      let volume = 0;
      for (const log of WORKOUT_HISTORY) {
        const logDate = new Date(log.date + 'T12:00:00');
        if (logDate >= weekStart && logDate <= weekEnd) {
          for (const ex of log.exercises) {
            for (const set of ex.sets) {
              const w = parseFloat(set.weight);
              const r = parseInt(set.reps, 10);
              if (!isNaN(w) && !isNaN(r) && w > 0) volume += w * r;
            }
          }
        }
      }
      return {
        value: volume,
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isCurrent: i === 7,
      };
    });
  }, [today]);

  const maxValue = useMemo(() => Math.max(...bars.map((b) => b.value), 1), [bars]);
  const hasData = bars.some((b) => b.value > 0);

  if (!hasData) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>Start logging workouts to see volume data</Text>
      </View>
    );
  }

  return (
    <BarChart
      bars={bars}
      maxValue={maxValue}
      formatValue={(v) => `${(v / 1000).toFixed(0)}k`}
      formatLabel={(label, i) => (i % 2 === 1 ? label.split(' ')[1] : '')}
    />
  );
}

// ─── PR Trend Chart ───────────────────────────────────────────────────────────

const DOT = 9;
const TREND_H = 68;

function PRTrendChart() {
  const history = PR_HISTORY[0]; // bench press

  if (!history || history.entries.length < 2) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>Keep logging to see your progression trend</Text>
      </View>
    );
  }

  const { entries } = history;
  const weights = entries.map((e) => e.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const gain = maxW - weights[0];

  return (
    <View>
      {/* Subtitle row */}
      <View style={styles.trendSubRow}>
        <Text style={styles.trendExName}>{history.name}</Text>
        {gain > 0 && (
          <View style={styles.trendGainBadge}>
            <Ionicons name="trending-up" size={12} color={Colors.success} />
            <Text style={styles.trendGainText}>+{gain} lbs</Text>
          </View>
        )}
      </View>

      {/* Y range labels + dot chart */}
      <View style={styles.trendOuter}>
        {/* Y-axis */}
        <View style={styles.trendYAxis}>
          <Text style={styles.trendYLabel}>{maxW}</Text>
          <Text style={styles.trendYLabel}>{minW}</Text>
        </View>

        {/* Dots */}
        <View style={{ flex: 1 }}>
          <View style={{ height: TREND_H, flexDirection: 'row' }}>
            {entries.map((entry, i) => {
              const pct = (entry.weight - minW) / range;
              const top = (1 - pct) * (TREND_H - DOT);
              const isLast = i === entries.length - 1;
              return (
                <View key={i} style={{ flex: 1, height: TREND_H }}>
                  <View
                    style={{
                      position: 'absolute',
                      top,
                      left: 0,
                      right: 0,
                      alignItems: 'center',
                    }}
                  >
                    <View
                      style={[
                        styles.trendDot,
                        {
                          backgroundColor: isLast ? Colors.accent : Colors.background,
                          borderColor: isLast ? Colors.accent : Colors.surfaceElevated,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
          {/* Baseline */}
          <View style={styles.trendBaseline} />
          {/* X labels */}
          <View style={{ flexDirection: 'row', marginTop: 4 }}>
            {entries.map((entry, i) => (
              <Text key={i} style={styles.trendXLabel}>
                {i % 2 === 0 ? entry.date.slice(5).replace('-', '/') : ''}
              </Text>
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

const GOAL_OPTIONS = [
  'Build Muscle',
  'Lose Weight',
  'Improve Endurance',
  'Stay Active',
  'Athletic Performance',
];

type ProfileData = {
  name: string;
  goal: string;
  age: string;
  weight: string;
  height: string;
};

function EditProfileModal({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: ProfileData;
  onSave: (data: ProfileData) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ProfileData>(initial);

  React.useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible]);

  function set(field: keyof ProfileData, value: string) {
    setDraft((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.overlayBg} activeOpacity={1} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.sheetBody}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={draft.name}
              onChangeText={(v) => set('name', v)}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
            />

            <View style={styles.fieldRow}>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Age</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={draft.age}
                  onChangeText={(v) => set('age', v)}
                  keyboardType="number-pad"
                  placeholder="25"
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
              <View style={styles.fieldHalf}>
                <Text style={styles.fieldLabel}>Height</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={draft.height}
                  onChangeText={(v) => set('height', v)}
                  placeholder={`5'11"`}
                  placeholderTextColor={Colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Weight (lbs)</Text>
            <TextInput
              style={styles.fieldInput}
              value={draft.weight}
              onChangeText={(v) => set('weight', v)}
              keyboardType="decimal-pad"
              placeholder="175"
              placeholderTextColor={Colors.textMuted}
            />

            <Text style={styles.fieldLabel}>Fitness Goal</Text>
            <View style={styles.goalGrid}>
              {GOAL_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.goalChip, draft.goal === g && styles.goalChipActive]}
                  onPress={() => set('goal', g)}
                >
                  <Text style={[styles.goalChipText, draft.goal === g && styles.goalChipTextActive]}>
                    {g}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={() => onSave(draft)}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ─── Profile Screen ───────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);

  const [profile, setProfile] = useState<ProfileData>({
    name: 'Liam',
    goal: 'Build Muscle',
    age: '22',
    weight: '175',
    height: `5'11"`,
  });
  const [editVisible, setEditVisible] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);

  useEffect(() => {
    loadPoints().then((p) => setTotalPoints(p.totalPoints));
  }, []);

  const STATS = [
    { label: 'Workouts', value: String(WORKOUT_DAYS.size) },
    { label: 'Best Streak', value: '21d' },
    { label: 'Points', value: totalPoints.toLocaleString() },
  ];

  const MENU = [
    {
      icon: 'trophy-outline' as const,
      label: 'Personal Records',
      sub: '8 PRs tracked',
      route: '/prs' as const,
    },
    {
      icon: 'images-outline' as const,
      label: 'Memories',
      sub: 'Browse your workout history',
      route: '/memories' as const,
    },
    {
      icon: 'settings-outline' as const,
      label: 'Settings',
      sub: 'Preferences & account',
      route: null,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Profile header ─────────────────────────────── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={40} color={Colors.textSecondary} />
            </View>
            <TouchableOpacity style={styles.avatarEditBtn} onPress={() => setEditVisible(true)}>
              <Ionicons name="camera" size={12} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            <TouchableOpacity style={styles.editBtn} onPress={() => setEditVisible(true)}>
              <Ionicons name="pencil" size={13} color={Colors.accent} />
              <Text style={styles.editBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.goalTag}>{profile.goal}</Text>

          <View style={styles.bioRow}>
            {!!profile.age && <Text style={styles.bioChip}>{profile.age} yrs</Text>}
            {!!profile.weight && <Text style={styles.bioChip}>{profile.weight} lbs</Text>}
            {!!profile.height && <Text style={styles.bioChip}>{profile.height}</Text>}
          </View>
        </View>

        {/* ── Stats row ──────────────────────────────────── */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <View key={i} style={[styles.statCell, i > 0 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── This week ──────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>This Week</Text>
            <TouchableOpacity style={styles.viewMoreBtn} onPress={() => router.push('/streaks')}>
              <Text style={styles.viewMoreText}>View More</Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.accent} />
            </TouchableOpacity>
          </View>
          <WeekStrip today={today} />
        </View>

        {/* ── Frequency chart ────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Workouts / Week</Text>
            <Text style={styles.cardSub}>Last 8 weeks</Text>
          </View>
          <FrequencyChart today={today} />
        </View>

        {/* ── Volume chart ───────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Volume / Week</Text>
            <Text style={styles.cardSub}>Weight × reps (k lbs)</Text>
          </View>
          <VolumeChart today={today} />
        </View>

        {/* ── PR trend chart ─────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Top Lift Trend</Text>
            <Text style={styles.cardSub}>Best set per session</Text>
          </View>
          <PRTrendChart />
        </View>

        {/* ── Menu ───────────────────────────────────────── */}
        <View style={styles.menu}>
          {MENU.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i > 0 && styles.menuBorder]}
              onPress={() => item.route && router.push(item.route)}
              activeOpacity={item.route ? 0.7 : 1}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon} size={18} color={Colors.accent} />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuSub}>{item.sub}</Text>
              </View>
              {item.route && (
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              )}
            </TouchableOpacity>
          ))}
        </View>

      </ScrollView>

      <EditProfileModal
        visible={editVisible}
        initial={profile}
        onSave={(data) => { setProfile(data); setEditVisible(false); }}
        onClose={() => setEditVisible(false)}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: 40,
    gap: 16,
  },

  // ── Profile header
  profileHeader: {
    alignItems: 'center',
    paddingTop: 28,
    paddingBottom: 8,
    gap: 6,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 4,
  },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  avatarEditBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: Colors.surface,
    borderRadius: 8,
  },
  editBtnText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },
  goalTag: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  bioRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 2,
  },
  bioChip: {
    fontSize: 12,
    color: Colors.textMuted,
    backgroundColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // ── Stats
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingVertical: 18,
  },
  statCell: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statBorder: {
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },

  // ── Card (week strip + chart)
  card: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  cardSub: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewMoreText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '600',
  },

  // ── Week strip
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  weekDayCol: {
    alignItems: 'center',
    gap: 5,
    flex: 1,
  },
  weekLetter: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  weekDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated,
  },
  weekDotWorkout: {
    backgroundColor: Colors.accent,
  },
  weekDotMissed: {
    backgroundColor: 'rgba(229,57,53,0.1)',
  },
  weekDotToday: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  weekDayNum: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  weekNumFuture: {
    color: Colors.border,
  },
  weekNumMissed: {
    color: Colors.textMuted,
  },
  weekNumToday: {
    color: Colors.accent,
    fontWeight: '700',
  },

  // ── Progress chart
  chart: {
    gap: 4,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  chartCol: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  chartTrack: {
    width: '100%',
    backgroundColor: Colors.background,
    borderRadius: 4,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  chartFill: {
    width: '100%',
    borderRadius: 4,
  },
  chartCount: {
    fontSize: 9,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  chartAxis: {
    flexDirection: 'row',
    gap: 4,
  },
  chartAxisLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 9,
    color: Colors.textMuted,
  },

  // ── Empty chart
  emptyChart: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyChartText: {
    fontSize: 12,
    color: Colors.textMuted,
    textAlign: 'center',
  },

  // ── PR trend
  trendSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  trendExName: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  trendGainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.success + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendGainText: {
    fontSize: 11,
    color: Colors.success,
    fontWeight: '700',
  },
  trendOuter: {
    flexDirection: 'row',
    gap: 6,
  },
  trendYAxis: {
    width: 28,
    justifyContent: 'space-between',
    paddingBottom: 20,
  },
  trendYLabel: {
    fontSize: 9,
    color: Colors.textMuted,
    textAlign: 'right',
  },
  trendDot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 1.5,
  },
  trendBaseline: {
    height: 1,
    backgroundColor: Colors.border,
  },
  trendXLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 8,
    color: Colors.textMuted,
  },

  // ── Menu
  menu: {
    backgroundColor: Colors.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 14,
  },
  menuBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  menuIconBox: {
    width: 36,
    height: 36,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuInfo: {
    flex: 1,
    gap: 2,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  menuSub: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // ── Edit modal
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
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
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  sheetBody: {
    padding: 20,
    gap: 4,
    paddingBottom: 40,
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHalf: {
    flex: 1,
    gap: 4,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
    marginTop: 12,
  },
  fieldInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  goalChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  goalChipActive: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  goalChipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  goalChipTextActive: {
    color: '#fff',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
