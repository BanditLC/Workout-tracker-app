import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
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
import { WorkoutLog } from '@/constants/mockData';
import { loadPoints, loadWorkoutHistory, loadProfile, saveProfile } from '@/constants/storage';
import type { ProfileData } from '@/constants/storage';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabase } from '@/lib/supabase';

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

function WeekStrip({ today, workoutDays }: { today: Date; workoutDays: Set<string> }) {
  const days = useMemo(() => {
    const monday = getMonday(today);
    const todayKey = dateKey(today);
    return WEEK_LETTERS.map((letter, i) => {
      const date = addDays(monday, i);
      const key = dateKey(date);
      const isToday = key === todayKey;
      let status: DayStatus;
      if (date > today && !isToday) status = 'future';
      else if (workoutDays.has(key)) status = 'workout';
      else if (isToday) status = 'today';
      else status = 'missed';
      return { letter, dayNum: date.getDate(), status, isToday };
    });
  }, [today, workoutDays]);

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

function FrequencyChart({ today, workoutDays }: { today: Date; workoutDays: Set<string> }) {
  const bars = useMemo(() => {
    const monday = getMonday(today);
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = addDays(monday, -(7 - i) * 7);
      let count = 0;
      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        if (day > today) break;
        if (workoutDays.has(dateKey(day))) count++;
      }
      return {
        value: count,
        label: weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        isCurrent: i === 7,
      };
    });
  }, [today, workoutDays]);

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

function VolumeChart({ today, workoutHistory }: { today: Date; workoutHistory: WorkoutLog[] }) {
  const bars = useMemo(() => {
    const monday = getMonday(today);
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = addDays(monday, -(7 - i) * 7);
      const weekEnd = addDays(weekStart, 6);
      let volume = 0;
      for (const log of workoutHistory) {
        const logDate = new Date(log.date + 'T12:00:00');
        if (logDate >= weekStart && logDate <= weekEnd) {
          for (const ex of log.exercises) {
            for (const set of ex.sets) {
              // Total volume = weight × reps, summed across all sets
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
  }, [today, workoutHistory]);

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
const TREND_H = 80;

// Derive bench press best-set per workout from history
function getBenchPressEntries(workoutHistory: WorkoutLog[]) {
  const byDate: Record<string, number> = {};
  for (const log of workoutHistory) {
    for (const ex of log.exercises) {
      if (ex.id !== 'bench_press') continue;
      const best = ex.sets.reduce((max, s) => {
        const w = parseFloat(s.weight);
        return !isNaN(w) && w > max ? w : max;
      }, 0);
      if (best > 0) {
        byDate[log.date] = Math.max(byDate[log.date] ?? 0, best);
      }
    }
  }
  return Object.entries(byDate)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, weight]) => ({ date, weight }));
}

function PRTrendChart({ workoutHistory }: { workoutHistory: WorkoutLog[] }) {
  const [chartWidth, setChartWidth] = useState(0);

  const entries = useMemo(
    () => getBenchPressEntries(workoutHistory),
    [workoutHistory]
  );

  if (entries.length < 2) {
    return (
      <View style={styles.emptyChart}>
        <Text style={styles.emptyChartText}>
          Log bench press workouts to see your progression trend
        </Text>
      </View>
    );
  }

  const weights = entries.map((e) => e.weight);
  const minW = Math.min(...weights);
  const maxW = Math.max(...weights);
  const range = maxW - minW || 1;
  const gain = maxW - weights[0];
  const n = entries.length;
  const colWidth = chartWidth / n;

  // Compute dot center positions
  const dotPositions = entries.map((e, i) => {
    const pct = (e.weight - minW) / range;
    const cx = (i + 0.5) * colWidth;
    const cy = (1 - pct) * (TREND_H - DOT) + DOT / 2;
    return { cx, cy };
  });

  return (
    <View>
      {/* Subtitle row */}
      <View style={styles.trendSubRow}>
        <Text style={styles.trendExName}>Bench Press</Text>
        {gain > 0 && (
          <View style={styles.trendGainBadge}>
            <Ionicons name="trending-up" size={12} color={Colors.success} />
            <Text style={styles.trendGainText}>+{gain} lbs</Text>
          </View>
        )}
      </View>

      {/* Y range labels + chart */}
      <View style={styles.trendOuter}>
        {/* Y-axis */}
        <View style={styles.trendYAxis}>
          <Text style={styles.trendYLabel}>{maxW}</Text>
          <Text style={styles.trendYLabel}>{minW}</Text>
        </View>

        {/* Dots + connecting lines */}
        <View
          style={{ flex: 1 }}
          onLayout={(e) => setChartWidth(e.nativeEvent.layout.width)}
        >
          <View style={{ height: TREND_H }}>
            {/* Connecting lines between consecutive dots */}
            {chartWidth > 0 && dotPositions.map((pos, i) => {
              if (i === 0) return null;
              const prev = dotPositions[i - 1];
              const dx = pos.cx - prev.cx;
              const dy = pos.cy - prev.cy;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = Math.atan2(dy, dx) * (180 / Math.PI);
              const mx = (prev.cx + pos.cx) / 2;
              const my = (prev.cy + pos.cy) / 2;
              return (
                <View
                  key={`line-${i}`}
                  style={{
                    position: 'absolute',
                    left: mx - length / 2,
                    top: my - 1,
                    width: length,
                    height: 2,
                    backgroundColor: Colors.accent + '60',
                    transform: [{ rotate: `${angle}deg` }],
                  }}
                />
              );
            })}

            {/* Dots */}
            {chartWidth > 0 && entries.map((entry, i) => {
              const { cx, cy } = dotPositions[i];
              const isLast = i === n - 1;
              return (
                <View
                  key={i}
                  style={{
                    position: 'absolute',
                    left: cx - DOT / 2,
                    top: cy - DOT / 2,
                  }}
                >
                  <View
                    style={[
                      styles.trendDot,
                      {
                        backgroundColor: isLast ? Colors.accent : Colors.background,
                        borderColor: isLast ? Colors.accent : Colors.accent + '80',
                      },
                    ]}
                  />
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

type ProfileFormData = Omit<ProfileData, 'pictureUri'>;

function EditProfileModal({
  visible,
  initial,
  onSave,
  onClose,
}: {
  visible: boolean;
  initial: ProfileFormData;
  onSave: (data: ProfileFormData) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<ProfileFormData>(initial);

  React.useEffect(() => {
    if (visible) setDraft(initial);
  }, [visible]);

  function set(field: keyof ProfileFormData, value: string) {
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

async function pickImage(source: 'camera' | 'library'): Promise<string | null> {
  const launch = source === 'camera'
    ? ImagePicker.launchCameraAsync
    : ImagePicker.launchImageLibraryAsync;

  const result = await launch({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || result.assets.length === 0) return null;
  return result.assets[0].uri;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const today = useMemo(() => new Date(), []);

  const [profile, setProfile] = useState<ProfileData>({
    name: (user?.user_metadata?.name as string) ?? '',
    goal: 'Build Muscle',
    age: '22',
    weight: '175',
    height: `5'11"`,
    pictureUri: null,
  });
  const [editVisible, setEditVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [workoutHistory, setWorkoutHistory] = useState<WorkoutLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      Promise.all([loadPoints(), loadWorkoutHistory(), loadProfile()]).then(
        ([pts, history, savedProfile]) => {
          setTotalPoints(pts.totalPoints);
          setWorkoutHistory(history);
          setProfile(savedProfile);
        }
      );
    }, [])
  );

  const handleProfileSave = useCallback((formData: ProfileFormData) => {
    const updated = { ...profile, ...formData };
    setProfile(updated);
    saveProfile(updated, user?.id);
    setEditVisible(false);
  }, [profile, user]);

  const updatePicture = useCallback(async (source: 'camera' | 'library' | 'remove') => {
    setPickerVisible(false);
    if (source === 'remove') {
      const updated = { ...profile, pictureUri: null };
      setProfile(updated);
      saveProfile(updated, user?.id);
      return;
    }
    const localUri = await pickImage(source);
    if (!localUri) return;

    let pictureUri = localUri;

    if (user?.id) {
      try {
        const response = await fetch(localUri);
        const blob = await response.blob();
        const filePath = `${user.id}/profile.jpg`;
        await getSupabase().storage.from('avatars').upload(filePath, blob, {
          upsert: true,
          contentType: 'image/jpeg',
        });
        const { data } = getSupabase().storage.from('avatars').getPublicUrl(filePath);
        pictureUri = `${data.publicUrl}?t=${Date.now()}`;
      } catch {}
    }

    const updated = { ...profile, pictureUri };
    setProfile(updated);
    saveProfile(updated, user?.id);
  }, [profile, user]);

  // Derive workout days Set from stored history for calendar/frequency chart
  const workoutDays = useMemo(
    () => new Set(workoutHistory.map((w) => w.date)),
    [workoutHistory]
  );

  const STATS = [
    { label: 'Workouts', value: String(workoutDays.size) },
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
      onPress: null,
    },
    {
      icon: 'log-out-outline' as const,
      label: 'Sign Out',
      sub: user?.email ?? '',
      route: null,
      onPress: signOut,
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* ── Profile header ─────────────────────────────── */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {profile.pictureUri ? (
                <Image source={{ uri: profile.pictureUri }} style={styles.avatarImage} />
              ) : (
                <Ionicons name="person" size={40} color={Colors.textSecondary} />
              )}
            </View>
            <TouchableOpacity style={styles.avatarEditBtn} onPress={() => setPickerVisible(true)}>
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
          <WeekStrip today={today} workoutDays={workoutDays} />
        </View>

        {/* ── Frequency chart ────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Workouts / Week</Text>
            <Text style={styles.cardSub}>Last 8 weeks</Text>
          </View>
          <FrequencyChart today={today} workoutDays={workoutDays} />
        </View>

        {/* ── Volume chart ───────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Volume / Week</Text>
            <Text style={styles.cardSub}>Weight × reps (k lbs)</Text>
          </View>
          <VolumeChart today={today} workoutHistory={workoutHistory} />
        </View>

        {/* ── PR trend chart ─────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardTopRow}>
            <Text style={styles.cardTitle}>Top Lift Trend</Text>
            <Text style={styles.cardSub}>Best set per session</Text>
          </View>
          <PRTrendChart workoutHistory={workoutHistory} />
        </View>

        {/* ── Menu ───────────────────────────────────────── */}
        <View style={styles.menu}>
          {MENU.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i > 0 && styles.menuBorder]}
              onPress={() => {
                if (item.onPress) item.onPress();
                else if (item.route) router.push(item.route);
              }}
              activeOpacity={item.route || item.onPress ? 0.7 : 1}
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

      <Modal visible={pickerVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setPickerVisible(false)}
        >
          <View style={styles.actionSheet}>
            <Text style={styles.actionSheetTitle}>Profile Photo</Text>
            {Platform.OS !== 'web' && (
              <TouchableOpacity style={styles.actionSheetBtn} onPress={() => updatePicture('camera')}>
                <Ionicons name="camera-outline" size={20} color={Colors.textPrimary} />
                <Text style={styles.actionSheetBtnText}>Take Photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.actionSheetBtn} onPress={() => updatePicture('library')}>
              <Ionicons name="images-outline" size={20} color={Colors.textPrimary} />
              <Text style={styles.actionSheetBtnText}>Choose from Library</Text>
            </TouchableOpacity>
            {profile.pictureUri && (
              <TouchableOpacity style={styles.actionSheetBtn} onPress={() => updatePicture('remove')}>
                <Ionicons name="trash-outline" size={20} color={Colors.accent} />
                <Text style={[styles.actionSheetBtnText, { color: Colors.accent }]}>Remove Photo</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionSheetBtn, styles.actionSheetCancel]}
              onPress={() => setPickerVisible(false)}
            >
              <Text style={[styles.actionSheetBtnText, { textAlign: 'center' }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <EditProfileModal
        visible={editVisible}
        initial={profile}
        onSave={handleProfileSave}
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
    overflow: 'hidden',
  },
  avatarImage: {
    width: 84,
    height: 84,
    borderRadius: 42,
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

  // ── Photo picker action sheet
  actionSheet: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  actionSheetTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionSheetBtnText: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  actionSheetCancel: {
    justifyContent: 'center',
    borderBottomWidth: 0,
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
