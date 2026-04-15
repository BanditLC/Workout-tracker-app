import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';

import { Colors } from '@/constants/theme';
import { EXERCISE_LIBRARY, ExerciseInfo, PREV_PERFORMANCE, ROUTINES, WORKOUT_DAYS } from '@/constants/mockData';
import { addWorkoutPoints, loadSchedule } from '@/constants/storage';
import { calculateWorkoutPoints, computeCurrentStreak, WorkoutPointsEntry } from '@/constants/points';

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkoutSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
};

type ExerciseEntry = {
  id: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: WorkoutSet[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimer(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0)
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function makeSet(): WorkoutSet {
  return {
    id: Math.random().toString(36).slice(2),
    weight: '',
    reps: '',
    completed: false,
  };
}

// ─── Log Screen ───────────────────────────────────────────────────────────────

export default function LogScreen() {
  const router = useRouter();
  const { routineId } = useLocalSearchParams<{ routineId?: string }>();

  // Pre-populate from routine if provided
  const routineDefaults = useMemo(() => {
    if (!routineId) return null;
    return ROUTINES.find((r) => r.id === routineId) ?? null;
  }, [routineId]);

  const [elapsed, setElapsed] = useState(0);
  const [workoutName, setWorkoutName] = useState(routineDefaults?.name ?? 'My Workout');
  const [exercises, setExercises] = useState<ExerciseEntry[]>(
    routineDefaults?.exercises.map((ex) => ({
      id: Math.random().toString(36).slice(2),
      exerciseId: ex.id,
      name: ex.name,
      muscleGroup: EXERCISE_LIBRARY.find((e) => e.id === ex.id)?.muscleGroup ?? '',
      sets: Array.from({ length: ex.sets }, () => makeSet()),
    })) ?? []
  );
  const [notes, setNotes] = useState('');
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer on mount, clean up on unmount
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ── Exercise picker data ──────────────────────────────────────────────────

  const filteredExercises = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EXERCISE_LIBRARY;
    return EXERCISE_LIBRARY.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.toLowerCase().includes(q)
    );
  }, [search]);

  const groupedExercises = useMemo(() => {
    const groups: Record<string, ExerciseInfo[]> = {};
    filteredExercises.forEach((ex) => {
      if (!groups[ex.muscleGroup]) groups[ex.muscleGroup] = [];
      groups[ex.muscleGroup].push(ex);
    });
    return Object.entries(groups);
  }, [filteredExercises]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const addExercise = useCallback((ex: ExerciseInfo) => {
    setExercises((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: [makeSet()],
      },
    ]);
    setShowPicker(false);
    setSearch('');
  }, []);

  const removeExercise = useCallback((exId: string) => {
    setExercises((prev) => prev.filter((e) => e.id !== exId));
  }, []);

  const addSet = useCallback((exId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId ? { ...e, sets: [...e.sets, makeSet()] } : e
      )
    );
  }, []);

  const removeSet = useCallback((exId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId
          ? { ...e, sets: e.sets.filter((s) => s.id !== setId) }
          : e
      )
    );
  }, []);

  const updateSet = useCallback(
    (exId: string, setId: string, field: 'weight' | 'reps', value: string) => {
      setExercises((prev) =>
        prev.map((e) =>
          e.id === exId
            ? {
                ...e,
                sets: e.sets.map((s) =>
                  s.id === setId ? { ...s, [field]: value } : s
                ),
              }
            : e
        )
      );
    },
    []
  );

  const toggleSet = useCallback((exId: string, setId: string) => {
    setExercises((prev) =>
      prev.map((e) =>
        e.id === exId
          ? {
              ...e,
              sets: e.sets.map((s) =>
                s.id === setId ? { ...s, completed: !s.completed } : s
              ),
            }
          : e
      )
    );
  }, []);

  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter((s) => s.completed).length,
    0
  );

  // ── Points summary state ──────────────────────────────────────────────────
  const [pendingPoints, setPendingPoints] = useState<WorkoutPointsEntry | null>(null);
  const [summaryVisible, setSummaryVisible] = useState(false);

  async function handleFinish() {
    const streak = computeCurrentStreak(WORKOUT_DAYS);
    const today = new Date();
    const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
    const schedule = await loadSchedule();
    const todayEntry = schedule.find((e) => e.day === dayName);
    const isScheduledToday =
      !!todayEntry?.routineId && todayEntry.routineId === routineId;

    const points = calculateWorkoutPoints({
      workoutId: `live_${Date.now()}`,
      date: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`,
      workoutName,
      exercises: exercises.map((ex) => ({
        id: ex.exerciseId,
        name: ex.name,
        sets: ex.sets.map((s) => ({
          weight: s.weight,
          reps: s.reps,
          completed: s.completed,
        })),
      })),
      prevPerformance: PREV_PERFORMANCE,
      currentStreak: streak,
      isScheduledToday,
    });

    await addWorkoutPoints(points);
    setPendingPoints(points);
    setSummaryVisible(true);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Fixed header: cancel | timer | finish ─────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>

        <View style={styles.timerBlock}>
          <Ionicons name="timer-outline" size={15} color={Colors.accent} />
          <Text style={styles.timerText}>{formatTimer(elapsed)}</Text>
        </View>

        <TouchableOpacity style={styles.finishBtn} onPress={handleFinish}>
          <Ionicons name="checkmark" size={15} color="#fff" />
          <Text style={styles.finishText}>Finish</Text>
        </TouchableOpacity>
      </View>

      {/* ── Workout name ──────────────────────────────────────────────── */}
      <TextInput
        style={styles.workoutName}
        value={workoutName}
        onChangeText={setWorkoutName}
        selectionColor={Colors.accent}
        returnKeyType="done"
      />

      {/* ── Sets summary pill ─────────────────────────────────────────── */}
      {exercises.length > 0 && (
        <View style={styles.summaryRow}>
          <Text style={styles.summaryText}>
            {completedSets} set{completedSets !== 1 ? 's' : ''} completed
          </Text>
        </View>
      )}

      {/* ── Scrollable content ────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={52} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptySubtitle}>Tap Add Exercise to get started</Text>
            </View>
          ) : (
            exercises.map((ex) => (
              <ExerciseBlock
                key={ex.id}
                exercise={ex}
                onAddSet={() => addSet(ex.id)}
                onRemoveSet={(setId) => removeSet(ex.id, setId)}
                onUpdateSet={(setId, field, val) =>
                  updateSet(ex.id, setId, field, val)
                }
                onToggleSet={(setId) => toggleSet(ex.id, setId)}
                onRemoveExercise={() => removeExercise(ex.id)}
              />
            ))
          )}

          {/* Add exercise button */}
          <TouchableOpacity
            style={styles.addExBtn}
            onPress={() => setShowPicker(true)}
          >
            <Ionicons name="add-circle-outline" size={20} color={Colors.accent} />
            <Text style={styles.addExText}>Add Exercise</Text>
          </TouchableOpacity>

          {/* Notes */}
          <View style={styles.notesCard}>
            <View style={styles.notesHeader}>
              <Ionicons name="document-text-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.notesLabel}>Notes</Text>
            </View>
            <TextInput
              style={styles.notesInput}
              value={notes}
              onChangeText={setNotes}
              placeholder="How did it go? Any PRs today?"
              placeholderTextColor={Colors.textMuted}
              multiline
              numberOfLines={3}
              selectionColor={Colors.accent}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Exercise picker modal ─────────────────────────────────────── */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <TouchableOpacity
              onPress={() => {
                setShowPicker(false);
                setSearch('');
              }}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons
              name="search"
              size={18}
              color={Colors.textMuted}
              style={{ marginRight: 8 }}
            />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises or muscle groups..."
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.accent}
              autoFocus
              returnKeyType="search"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {groupedExercises.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No exercises found</Text>
              </View>
            ) : (
              groupedExercises.map(([group, exList]) => (
                <View key={group}>
                  <Text style={styles.groupHeader}>{group}</Text>
                  {exList.map((ex) => (
                    <TouchableOpacity
                      key={ex.id}
                      style={styles.pickerItem}
                      onPress={() => addExercise(ex)}
                    >
                      <View style={styles.pickerItemLeft}>
                        <Text style={styles.pickerName}>{ex.name}</Text>
                        {PREV_PERFORMANCE[ex.id] ? (
                          <Text style={styles.pickerPrev}>
                            Last: {PREV_PERFORMANCE[ex.id]}
                          </Text>
                        ) : null}
                      </View>
                      <Ionicons
                        name="add-circle-outline"
                        size={22}
                        color={Colors.accent}
                      />
                    </TouchableOpacity>
                  ))}
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ── Workout summary modal ──────────────────────────────────── */}
      {pendingPoints && (
        <Modal visible={summaryVisible} animationType="slide" transparent>
          <View style={styles.summaryOverlay}>
            <View style={styles.summarySheet}>
              <View style={styles.summaryHandle} />

              {/* Trophy */}
              <View style={styles.summaryTrophyRow}>
                <View style={styles.summaryTrophyCircle}>
                  <Ionicons name="trophy" size={36} color={Colors.accent} />
                </View>
              </View>
              <Text style={styles.summaryTitle}>Workout Complete!</Text>
              <Text style={styles.summaryDuration}>{formatTimer(elapsed)}</Text>

              {/* Total points */}
              <View style={styles.summaryPointsRow}>
                <Text style={styles.summaryPointsNum}>+{pendingPoints.total}</Text>
                <Text style={styles.summaryPointsLabel}>points earned</Text>
              </View>

              {/* Breakdown */}
              <View style={styles.summaryBreakdown}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>
                    Volume{' '}
                    <Text style={styles.summaryRowMeta}>
                      ({(pendingPoints.volume / 1000).toFixed(1)}k lbs)
                    </Text>
                  </Text>
                  <Text style={styles.summaryRowPts}>+{pendingPoints.volumePoints} pts</Text>
                </View>

                {pendingPoints.improvementBonus > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>
                      PRs beaten{' '}
                      <Text style={styles.summaryRowMeta}>
                        ({pendingPoints.improvements.length}×)
                      </Text>
                    </Text>
                    <Text style={[styles.summaryRowPts, { color: Colors.success }]}>
                      +{pendingPoints.improvementBonus} pts
                    </Text>
                  </View>
                )}

                {pendingPoints.streakBonus > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>
                      Streak bonus{' '}
                      <Text style={styles.summaryRowMeta}>
                        ({pendingPoints.streakDays}-day)
                      </Text>
                    </Text>
                    <Text style={styles.summaryRowPts}>+{pendingPoints.streakBonus} pts</Text>
                  </View>
                )}

                {pendingPoints.consistencyBonus > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryRowLabel}>Scheduled workout ✓</Text>
                    <Text style={[styles.summaryRowPts, { color: Colors.success }]}>
                      +{pendingPoints.consistencyBonus} pts
                    </Text>
                  </View>
                )}
              </View>

              {/* PR list */}
              {pendingPoints.improvements.length > 0 && (
                <View style={styles.summaryPRList}>
                  {pendingPoints.improvements.map((imp, i) => (
                    <View key={i} style={styles.summaryPRRow}>
                      <Ionicons name="trending-up" size={13} color={Colors.success} />
                      <Text style={styles.summaryPRText}>{imp}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity
                style={styles.summaryDoneBtn}
                onPress={() => {
                  setSummaryVisible(false);
                  router.back();
                }}
              >
                <Text style={styles.summaryDoneBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

// ─── ExerciseBlock ────────────────────────────────────────────────────────────

type ExerciseBlockProps = {
  exercise: ExerciseEntry;
  onAddSet: () => void;
  onRemoveSet: (setId: string) => void;
  onUpdateSet: (setId: string, field: 'weight' | 'reps', val: string) => void;
  onToggleSet: (setId: string) => void;
  onRemoveExercise: () => void;
};

function ExerciseBlock({
  exercise,
  onAddSet,
  onRemoveSet,
  onUpdateSet,
  onToggleSet,
  onRemoveExercise,
}: ExerciseBlockProps) {
  const prev = PREV_PERFORMANCE[exercise.exerciseId];

  return (
    <View style={styles.exCard}>
      {/* Exercise header */}
      <View style={styles.exHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exName}>{exercise.name}</Text>
          <Text style={styles.exGroup}>{exercise.muscleGroup}</Text>
        </View>
        <TouchableOpacity
          onPress={onRemoveExercise}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Column headers */}
      <View style={styles.setRowHeader}>
        <Text style={[styles.colHeaderText, styles.colSet]}>SET</Text>
        <Text style={[styles.colHeaderText, styles.colPrev]}>PREV</Text>
        <Text style={[styles.colHeaderText, styles.colInput]}>LBS</Text>
        <Text style={[styles.colHeaderText, styles.colInput]}>REPS</Text>
        <View style={styles.colCheck} />
      </View>

      {/* Set rows */}
      {exercise.sets.map((set, idx) => (
        <View
          key={set.id}
          style={[styles.setRow, set.completed && styles.setRowDone]}
        >
          <Text style={[styles.setNum, styles.colSet]}>{idx + 1}</Text>
          <Text style={[styles.setPrev, styles.colPrev]}>
            {prev ?? '—'}
          </Text>
          <TextInput
            style={[
              styles.setInput,
              styles.colInput,
              set.completed && styles.setInputDone,
            ]}
            value={set.weight}
            onChangeText={(v) => onUpdateSet(set.id, 'weight', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            selectionColor={Colors.accent}
            editable={!set.completed}
            textAlign="center"
          />
          <TextInput
            style={[
              styles.setInput,
              styles.colInput,
              set.completed && styles.setInputDone,
            ]}
            value={set.reps}
            onChangeText={(v) => onUpdateSet(set.id, 'reps', v)}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={Colors.textMuted}
            selectionColor={Colors.accent}
            editable={!set.completed}
            textAlign="center"
          />
          <TouchableOpacity
            style={styles.colCheck}
            onPress={() => onToggleSet(set.id)}
          >
            <View
              style={[
                styles.checkCircle,
                set.completed && styles.checkCircleDone,
              ]}
            >
              {set.completed && (
                <Ionicons name="checkmark" size={13} color="#fff" />
              )}
            </View>
          </TouchableOpacity>
        </View>
      ))}

      {/* Add set */}
      <TouchableOpacity style={styles.addSetBtn} onPress={onAddSet}>
        <Ionicons name="add" size={16} color={Colors.accent} />
        <Text style={styles.addSetText}>Add Set</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const COL_SET = 32;
const COL_PREV = 96;
const COL_INPUT = 58;
const COL_CHECK = 40;

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
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    minWidth: 70,
  },
  cancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  timerBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  timerText: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
    fontVariant: ['tabular-nums'],
  },
  finishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Colors.accent,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    minWidth: 70,
    justifyContent: 'center',
  },
  finishText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Workout name
  workoutName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 6,
  },

  // Summary
  summaryRow: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  summaryText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 16,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  // Exercise card
  exCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  exHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  exName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.accent,
  },
  exGroup: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },

  // Set table
  setRowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.surfaceElevated,
  },
  colHeaderText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  colSet: { width: COL_SET, textAlign: 'center' },
  colPrev: { flex: 1, textAlign: 'left' },
  colInput: { width: COL_INPUT, textAlign: 'center' },
  colCheck: { width: COL_CHECK, alignItems: 'center' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  setRowDone: {
    backgroundColor: 'rgba(229,57,53,0.06)',
  },
  setNum: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  setPrev: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  setInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 6,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginHorizontal: 3,
  },
  setInputDone: {
    opacity: 0.4,
  },
  checkCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkCircleDone: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },

  // Add set
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addSetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Add exercise button
  addExBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  addExText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Notes
  notesCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  notesInput: {
    fontSize: 14,
    color: Colors.textPrimary,
    minHeight: 72,
    lineHeight: 20,
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 15,
    color: Colors.textMuted,
  },
  groupHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 6,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pickerItemLeft: {
    flex: 1,
    gap: 3,
  },
  pickerName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  pickerPrev: {
    fontSize: 12,
    color: Colors.textMuted,
  },

  // ── Workout summary modal
  summaryOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  summarySheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
  },
  summaryHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 10, marginBottom: 8,
  },
  summaryTrophyRow: {
    alignItems: 'center',
    marginTop: 12, marginBottom: 8,
  },
  summaryTrophyCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: Colors.accent + '22',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.accent + '44',
  },
  summaryTitle: {
    fontSize: 22, fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  summaryDuration: {
    fontSize: 14, color: Colors.textMuted,
    textAlign: 'center', marginTop: 2,
  },
  summaryPointsRow: {
    alignItems: 'center',
    marginVertical: 16,
  },
  summaryPointsNum: {
    fontSize: 52, fontWeight: '900',
    color: Colors.accent, lineHeight: 56,
  },
  summaryPointsLabel: {
    fontSize: 14, color: Colors.textSecondary,
    fontWeight: '600',
  },
  summaryBreakdown: {
    marginHorizontal: 24,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 14,
    padding: 14,
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowLabel: {
    fontSize: 14, color: Colors.textPrimary,
    fontWeight: '500',
  },
  summaryRowMeta: {
    fontSize: 12, color: Colors.textMuted,
    fontWeight: '400',
  },
  summaryRowPts: {
    fontSize: 14, fontWeight: '700',
    color: Colors.accent,
  },
  summaryPRList: {
    marginHorizontal: 24,
    marginTop: 12,
    gap: 6,
  },
  summaryPRRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  summaryPRText: {
    fontSize: 13, color: Colors.success,
    fontWeight: '500',
  },
  summaryDoneBtn: {
    marginHorizontal: 24,
    marginTop: 20,
    backgroundColor: Colors.accent,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  summaryDoneBtnText: {
    fontSize: 16, fontWeight: '800',
    color: '#fff',
  },
});
