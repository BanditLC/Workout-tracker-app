import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  EXERCISE_LIBRARY,
  ExerciseInfo,
  PREV_PERFORMANCE,
  Routine,
} from '@/constants/mockData';
import { loadRoutines, upsertRoutine } from '@/constants/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type RoutineEntry = {
  uid: string;
  exerciseId: string;
  name: string;
  muscleGroup: string;
  sets: string;
  reps: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeUid(): string {
  return Math.random().toString(36).slice(2);
}

function routineToEntries(routine: Routine): RoutineEntry[] {
  return routine.exercises.map((ex) => ({
    uid: makeUid(),
    exerciseId: ex.id,
    name: ex.name,
    muscleGroup: EXERCISE_LIBRARY.find((e) => e.id === ex.id)?.muscleGroup ?? '',
    sets: String(ex.sets),
    reps: ex.reps,
  }));
}

// ─── Routine Editor ───────────────────────────────────────────────────────────

export default function RoutineEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const isNew = id === 'new';

  const [isReady, setIsReady] = useState(isNew); // new routines are immediately ready
  const [name, setName] = useState('');
  const [exercises, setExercises] = useState<RoutineEntry[]>([]);
  const [saving, setSaving] = useState(false);

  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState('');

  // ── Load from storage on mount (edit mode) ──────────────────────────────

  useEffect(() => {
    if (isNew) return;
    loadRoutines().then((routines) => {
      const found = routines.find((r) => r.id === id);
      if (found) {
        setName(found.name);
        setExercises(routineToEntries(found));
      }
      setIsReady(true);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Exercise picker data ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return EXERCISE_LIBRARY;
    return EXERCISE_LIBRARY.filter(
      (e) =>
        e.name.toLowerCase().includes(q) ||
        e.muscleGroup.toLowerCase().includes(q)
    );
  }, [search]);

  const grouped = useMemo(() => {
    const g: Record<string, ExerciseInfo[]> = {};
    filtered.forEach((ex) => {
      if (!g[ex.muscleGroup]) g[ex.muscleGroup] = [];
      g[ex.muscleGroup].push(ex);
    });
    return Object.entries(g);
  }, [filtered]);

  // ── Mutations ────────────────────────────────────────────────────────────

  const addExercise = useCallback((ex: ExerciseInfo) => {
    setExercises((prev) => [
      ...prev,
      {
        uid: makeUid(),
        exerciseId: ex.id,
        name: ex.name,
        muscleGroup: ex.muscleGroup,
        sets: '3',
        reps: '8',
      },
    ]);
    setShowPicker(false);
    setSearch('');
  }, []);

  const removeExercise = useCallback((entryUid: string) => {
    setExercises((prev) => prev.filter((e) => e.uid !== entryUid));
  }, []);

  const updateField = useCallback(
    (entryUid: string, field: 'sets' | 'reps', value: string) => {
      setExercises((prev) =>
        prev.map((e) => (e.uid === entryUid ? { ...e, [field]: value } : e))
      );
    },
    []
  );

  const moveUp = useCallback((index: number) => {
    if (index === 0) return;
    setExercises((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }, []);

  const moveDown = useCallback((index: number) => {
    setExercises((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }, []);

  // ── Save ─────────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please give your routine a name.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('No exercises', 'Add at least one exercise to your routine.');
      return;
    }

    // Auto-generate tag from unique muscle groups in order
    const seen = new Set<string>();
    const muscleGroups: string[] = [];
    for (const ex of exercises) {
      if (!seen.has(ex.muscleGroup)) {
        seen.add(ex.muscleGroup);
        muscleGroups.push(ex.muscleGroup);
      }
    }
    const tag = muscleGroups.join(' · ');

    const routine: Routine = {
      id: isNew ? `user_${Date.now()}` : id,
      name: name.trim(),
      tag,
      exercises: exercises.map((e) => ({
        id: e.exerciseId,
        name: e.name,
        sets: Math.max(1, parseInt(e.sets, 10) || 3),
        reps: e.reps || '8',
      })),
    };

    setSaving(true);
    try {
      await upsertRoutine(routine);
      router.back();
    } catch {
      Alert.alert('Error', 'Could not save routine. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const totalSets = exercises.reduce(
    (a, ex) => a + (parseInt(ex.sets, 10) || 0),
    0
  );

  // ── Render ───────────────────────────────────────────────────────────────

  if (!isReady) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingCenter}>
          <ActivityIndicator color={Colors.accent} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* ── Header ──────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isNew ? 'New Routine' : 'Edit Routine'}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveBtnText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Routine name */}
          <View style={styles.nameCard}>
            <Text style={styles.nameLabel}>Routine Name</Text>
            <TextInput
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Upper Body Push"
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.accent}
              returnKeyType="done"
            />
          </View>

          {/* Summary pill */}
          {exercises.length > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryText}>
                {exercises.length} exercise{exercises.length !== 1 ? 's' : ''} · {totalSets} sets
              </Text>
            </View>
          )}

          {/* Exercise list */}
          {exercises.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="barbell-outline" size={48} color={Colors.textMuted} />
              <Text style={styles.emptyTitle}>No exercises yet</Text>
              <Text style={styles.emptySubtitle}>Tap Add Exercise to build your routine</Text>
            </View>
          ) : (
            exercises.map((entry, index) => (
              <View key={entry.uid} style={styles.exCard}>
                {/* Exercise header */}
                <View style={styles.exHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.exName}>{entry.name}</Text>
                    <Text style={styles.exGroup}>{entry.muscleGroup}</Text>
                  </View>
                  <View style={styles.exHeaderActions}>
                    <TouchableOpacity
                      onPress={() => moveUp(index)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
                    >
                      <Ionicons
                        name="chevron-up"
                        size={16}
                        color={index === 0 ? Colors.textMuted : Colors.textSecondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => moveDown(index)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                      style={[
                        styles.reorderBtn,
                        index === exercises.length - 1 && styles.reorderBtnDisabled,
                      ]}
                    >
                      <Ionicons
                        name="chevron-down"
                        size={16}
                        color={
                          index === exercises.length - 1
                            ? Colors.textMuted
                            : Colors.textSecondary
                        }
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => removeExercise(entry.uid)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                    >
                      <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Sets / Reps inputs */}
                <View style={styles.exInputRow}>
                  <View style={styles.exInputGroup}>
                    <Text style={styles.exInputLabel}>SETS</Text>
                    <TextInput
                      style={styles.exInput}
                      value={entry.sets}
                      onChangeText={(v) => updateField(entry.uid, 'sets', v)}
                      keyboardType="numeric"
                      maxLength={2}
                      selectionColor={Colors.accent}
                      textAlign="center"
                    />
                  </View>
                  <Text style={styles.exInputSep}>×</Text>
                  <View style={styles.exInputGroup}>
                    <Text style={styles.exInputLabel}>REPS</Text>
                    <TextInput
                      style={styles.exInput}
                      value={entry.reps}
                      onChangeText={(v) => updateField(entry.uid, 'reps', v)}
                      keyboardType="default"
                      maxLength={6}
                      selectionColor={Colors.accent}
                      textAlign="center"
                      placeholder="8-12"
                      placeholderTextColor={Colors.textMuted}
                    />
                  </View>
                  {PREV_PERFORMANCE[entry.exerciseId] ? (
                    <View style={styles.exPrevBlock}>
                      <Text style={styles.exPrevLabel}>PREV</Text>
                      <Text style={styles.exPrevValue}>
                        {PREV_PERFORMANCE[entry.exerciseId]}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
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
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Exercise picker modal ─────────────────────────────────── */}
      <Modal
        visible={showPicker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            <TouchableOpacity
              onPress={() => { setShowPicker(false); setSearch(''); }}
            >
              <Ionicons name="close" size={24} color={Colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={18} color={Colors.textMuted} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
              placeholder="Search exercises..."
              placeholderTextColor={Colors.textMuted}
              selectionColor={Colors.accent}
              autoFocus
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
            {grouped.map(([group, exList]) => (
              <View key={group}>
                <Text style={styles.groupHeader}>{group}</Text>
                {exList.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.pickerItem}
                    onPress={() => addExercise(ex)}
                  >
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.pickerName}>{ex.name}</Text>
                      {PREV_PERFORMANCE[ex.id] ? (
                        <Text style={styles.pickerPrev}>
                          Last: {PREV_PERFORMANCE[ex.id]}
                        </Text>
                      ) : null}
                    </View>
                    <Ionicons name="add-circle-outline" size={22} color={Colors.accent} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

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
  headerTitle: {
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
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 12,
  },

  // Name card
  nameCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 8,
  },
  nameLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  nameInput: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingVertical: 4,
  },

  // Summary
  summaryRow: { paddingLeft: 2 },
  summaryText: { fontSize: 13, color: Colors.textSecondary },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: Colors.textPrimary },
  emptySubtitle: { fontSize: 13, color: Colors.textSecondary },

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
  exName: { fontSize: 15, fontWeight: '700', color: Colors.accent },
  exGroup: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  exHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  reorderBtn: { padding: 2 },
  reorderBtnDisabled: { opacity: 0.3 },

  // Sets / reps row
  exInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  exInputGroup: { alignItems: 'center', gap: 4 },
  exInputLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  exInput: {
    width: 56,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 10,
    paddingVertical: 8,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  exInputSep: {
    fontSize: 18,
    color: Colors.textMuted,
    fontWeight: '600',
    marginTop: 14,
  },
  exPrevBlock: {
    marginLeft: 'auto',
    alignItems: 'flex-end',
    gap: 2,
  },
  exPrevLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
  },
  exPrevValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
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
  addExText: { fontSize: 15, fontWeight: '600', color: Colors.accent },

  // Modal
  modalContainer: { flex: 1, backgroundColor: Colors.background },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 15, color: Colors.textPrimary },
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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  pickerName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  pickerPrev: { fontSize: 12, color: Colors.textMuted },
});
