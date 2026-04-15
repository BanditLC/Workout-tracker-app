import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { Routine } from '@/constants/mockData';
import {
  ScheduleEntry,
  loadRoutines,
  loadSchedule,
  saveSchedule,
} from '@/constants/storage';

const TODAY_DOW = new Date().toLocaleDateString('en-US', { weekday: 'long' });

// ─── Routine Picker Modal ─────────────────────────────────────────────────────

function RoutinePicker({
  visible,
  day,
  currentId,
  routines,
  onSelect,
  onClose,
}: {
  visible: boolean;
  day: string;
  currentId: string | null;
  routines: Routine[];
  onSelect: (routineId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.pickerOverlay}>
        <TouchableOpacity style={styles.pickerBg} activeOpacity={1} onPress={onClose} />
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHandle} />
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>{day}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={22} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Rest option */}
            <TouchableOpacity
              style={[styles.pickerItem, currentId === null && styles.pickerItemActive]}
              onPress={() => onSelect(null)}
            >
              <View style={styles.pickerItemIcon}>
                <Ionicons name="moon-outline" size={18} color={Colors.textSecondary} />
              </View>
              <View style={styles.pickerItemInfo}>
                <Text style={[styles.pickerItemName, currentId === null && styles.pickerItemNameActive]}>
                  Rest Day
                </Text>
                <Text style={styles.pickerItemTag}>No workout scheduled</Text>
              </View>
              {currentId === null && (
                <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
              )}
            </TouchableOpacity>

            {/* Routines */}
            {routines.map((r) => {
              const totalSets = r.exercises.reduce((a, ex) => a + ex.sets, 0);
              const isActive = currentId === r.id;
              return (
                <TouchableOpacity
                  key={r.id}
                  style={[styles.pickerItem, isActive && styles.pickerItemActive]}
                  onPress={() => onSelect(r.id)}
                >
                  <View style={[styles.pickerItemIcon, { backgroundColor: Colors.accent + '22' }]}>
                    <Ionicons name="barbell-outline" size={18} color={Colors.accent} />
                  </View>
                  <View style={styles.pickerItemInfo}>
                    <Text style={[styles.pickerItemName, isActive && styles.pickerItemNameActive]}>
                      {r.name}
                    </Text>
                    <Text style={styles.pickerItemTag}>
                      {r.exercises.length} exercises · {totalSets} sets
                    </Text>
                  </View>
                  {isActive && (
                    <Ionicons name="checkmark-circle" size={20} color={Colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Schedule Screen ──────────────────────────────────────────────────────────

export default function ScheduleScreen() {
  const router = useRouter();

  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState<ScheduleEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [pickerDayIndex, setPickerDayIndex] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([loadSchedule(), loadRoutines()]).then(([sched, rts]) => {
      setSchedule(sched);
      setDraft(sched);
      setRoutines(rts);
      setIsReady(true);
    });
  }, []);

  function getRoutine(id: string | null): Routine | undefined {
    if (!id) return undefined;
    return routines.find((r) => r.id === id);
  }

  function enterEditMode() {
    setDraft([...schedule]);
    setEditMode(true);
  }

  function cancelEdit() {
    setDraft([...schedule]);
    setEditMode(false);
  }

  async function saveEdit() {
    setSaving(true);
    try {
      await saveSchedule(draft);
      setSchedule(draft);
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  }

  function handleSelect(dayIndex: number, routineId: string | null) {
    setDraft((prev) =>
      prev.map((entry, i) => (i === dayIndex ? { ...entry, routineId } : entry))
    );
    setPickerDayIndex(null);
  }

  function startRoutine(routineId: string) {
    router.push({ pathname: '/(tabs)/log', params: { routineId } });
  }

  const displayed = editMode ? draft : schedule;
  const pickerEntry = pickerDayIndex !== null ? displayed[pickerDayIndex] : null;

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Weekly Schedule</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (editMode ? cancelEdit() : router.back())}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={editMode ? 'close' : 'arrow-back'}
            size={24}
            color={Colors.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.title}>
          {editMode ? 'Edit Schedule' : 'Weekly Schedule'}
        </Text>
        {editMode ? (
          <TouchableOpacity
            style={[styles.saveBtn, saving && { opacity: 0.6 }]}
            onPress={saveEdit}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>This Week</Text>

        {displayed.map((entry, i) => {
          const routine = getRoutine(entry.routineId);
          const isToday = entry.day === TODAY_DOW;
          const isRest = entry.routineId === null;

          return (
            <View key={entry.day} style={[styles.card, isToday && styles.cardToday]}>
              {/* Day label */}
              <View style={styles.dayCol}>
                <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                  {entry.day.slice(0, 3).toUpperCase()}
                </Text>
                {isToday && <View style={styles.todayDot} />}
              </View>

              <View style={styles.divider} />

              {/* Workout info */}
              <View style={styles.workoutInfo}>
                <Text style={[styles.workoutName, isRest && styles.restText]}>
                  {routine ? routine.name : 'Rest Day'}
                </Text>
                <Text style={styles.workoutTag}>
                  {routine
                    ? `${routine.exercises.length} exercises · ${routine.tag}`
                    : 'Recovery'}
                </Text>
              </View>

              {/* Action */}
              {editMode ? (
                <TouchableOpacity
                  style={styles.changeBtn}
                  onPress={() => setPickerDayIndex(i)}
                >
                  <Text style={styles.changeBtnText}>Change</Text>
                </TouchableOpacity>
              ) : isRest ? (
                <View style={styles.restIcon}>
                  <Ionicons name="moon-outline" size={16} color={Colors.textMuted} />
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.playBtn}
                  onPress={() => startRoutine(entry.routineId!)}
                >
                  <Ionicons name="play" size={15} color="#fff" />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        {!editMode && (
          <TouchableOpacity style={styles.editRowBtn} onPress={enterEditMode}>
            <Ionicons name="create-outline" size={18} color={Colors.accent} />
            <Text style={styles.editRowBtnText}>Edit Schedule</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* ── Routine picker ──────────────────────────────────────────── */}
      {pickerDayIndex !== null && pickerEntry && (
        <RoutinePicker
          visible
          day={pickerEntry.day}
          currentId={pickerEntry.routineId}
          routines={routines}
          onSelect={(id) => handleSelect(pickerDayIndex, id)}
          onClose={() => setPickerDayIndex(null)}
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
  loadingCenter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    minWidth: 56,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  content: {
    padding: 16,
    gap: 10,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  // Day card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  cardToday: {
    borderWidth: 1.5,
    borderColor: Colors.accent,
  },
  dayCol: {
    width: 36,
    alignItems: 'center',
    gap: 4,
  },
  dayText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.5,
  },
  dayTextToday: {
    color: Colors.accent,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.accent,
  },
  divider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border,
  },
  workoutInfo: {
    flex: 1,
    gap: 3,
  },
  workoutName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  restText: {
    color: Colors.textMuted,
  },
  workoutTag: {
    fontSize: 11,
    color: Colors.textSecondary,
  },

  // Buttons in card
  playBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  restIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  changeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Edit schedule button (bottom of list)
  editRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editRowBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Routine picker modal
  pickerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  pickerBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  pickerSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
  },
  pickerHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  pickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemActive: {
    backgroundColor: Colors.surfaceElevated,
  },
  pickerItemIcon: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerItemInfo: {
    flex: 1,
    gap: 3,
  },
  pickerItemName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  pickerItemNameActive: {
    color: Colors.accent,
  },
  pickerItemTag: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
