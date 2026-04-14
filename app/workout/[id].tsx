import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
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
import { WORKOUT_HISTORY, WorkoutExercise, WorkoutSet } from '@/constants/mockData';

// ─── Editable types (local copies with string-only values) ───────────────────

type EditableSet = {
  weight: string;
  reps: string;
};

type EditableExercise = {
  id: string;
  name: string;
  sets: EditableSet[];
};

type EditableWorkout = {
  name: string;
  dateLabel: string;
  duration: string;
  exercises: EditableExercise[];
};

function toEditable(exercise: WorkoutExercise): EditableExercise {
  return {
    id: exercise.id,
    name: exercise.name,
    sets: exercise.sets.map((s: WorkoutSet) => ({
      weight: s.weight,
      reps: s.reps,
    })),
  };
}

// ─── Workout Detail Screen ────────────────────────────────────────────────────

export default function WorkoutDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const source = WORKOUT_HISTORY.find((w) => w.id === id);

  const [workout, setWorkout] = useState<EditableWorkout | null>(
    source
      ? {
          name: source.name,
          dateLabel: source.dateLabel,
          duration: source.duration,
          exercises: source.exercises.map(toEditable),
        }
      : null
  );

  const [dirty, setDirty] = useState(false);

  if (!workout) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Workout not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Mutations ───────────────────────────────────────────────────────────

  function updateSet(
    exIdx: number,
    setIdx: number,
    field: 'weight' | 'reps',
    value: string
  ) {
    setWorkout((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, ei) =>
        ei === exIdx
          ? {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si === setIdx ? { ...s, [field]: value } : s
              ),
            }
          : ex
      );
      return { ...prev, exercises };
    });
    setDirty(true);
  }

  function addSet(exIdx: number) {
    setWorkout((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [...ex.sets, { weight: lastSet?.weight ?? '', reps: lastSet?.reps ?? '' }],
        };
      });
      return { ...prev, exercises };
    });
    setDirty(true);
  }

  function removeSet(exIdx: number, setIdx: number) {
    setWorkout((prev) => {
      if (!prev) return prev;
      const exercises = prev.exercises.map((ex, ei) =>
        ei === exIdx
          ? { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
          : ex
      );
      return { ...prev, exercises };
    });
    setDirty(true);
  }

  function handleSave() {
    // In a real app this would persist to storage/API
    setDirty(false);
    Alert.alert('Saved', 'Workout updated successfully.');
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const totalSets = workout.exercises.reduce((a, ex) => a + ex.sets.length, 0);
  const totalVolume = workout.exercises.reduce(
    (a, ex) =>
      a +
      ex.sets.reduce((b, s) => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        return b + w * r;
      }, 0),
    0
  );

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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {workout.name}
          </Text>
          <Text style={styles.headerMeta}>
            {workout.dateLabel} · {workout.duration}
          </Text>
        </View>
        {dirty ? (
          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 52 }} />
        )}
      </View>

      {/* ── Summary bar ─────────────────────────────────────────────── */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{workout.exercises.length}</Text>
          <Text style={styles.summaryLabel}>Exercises</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalSets}</Text>
          <Text style={styles.summaryLabel}>Sets</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{totalVolume.toLocaleString()}</Text>
          <Text style={styles.summaryLabel}>lbs volume</Text>
        </View>
      </View>

      {/* ── Exercise list ────────────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {workout.exercises.map((ex, exIdx) => (
            <View key={`${ex.id}-${exIdx}`} style={styles.exCard}>
              {/* Exercise header */}
              <View style={styles.exHeader}>
                <Text style={styles.exName}>{ex.name}</Text>
              </View>

              {/* Column headers */}
              <View style={styles.rowHeader}>
                <Text style={[styles.colHdr, styles.colSet]}>SET</Text>
                <Text style={[styles.colHdr, styles.colInput]}>LBS</Text>
                <Text style={[styles.colHdr, styles.colInput]}>REPS</Text>
                <View style={styles.colDel} />
              </View>

              {/* Set rows */}
              {ex.sets.map((set, setIdx) => (
                <View key={setIdx} style={styles.setRow}>
                  <Text style={[styles.setNum, styles.colSet]}>{setIdx + 1}</Text>
                  <TextInput
                    style={[styles.setInput, styles.colInput]}
                    value={set.weight}
                    onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    selectionColor={Colors.accent}
                    textAlign="center"
                  />
                  <TextInput
                    style={[styles.setInput, styles.colInput]}
                    value={set.reps}
                    onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                    keyboardType="numeric"
                    placeholder="—"
                    placeholderTextColor={Colors.textMuted}
                    selectionColor={Colors.accent}
                    textAlign="center"
                  />
                  <TouchableOpacity
                    style={styles.colDel}
                    onPress={() => removeSet(exIdx, setIdx)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name="remove-circle-outline"
                      size={18}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Add set */}
              <TouchableOpacity
                style={styles.addSetBtn}
                onPress={() => addSet(exIdx)}
              >
                <Ionicons name="add" size={15} color={Colors.accent} />
                <Text style={styles.addSetText}>Add Set</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Save button (bottom) */}
          {dirty && (
            <TouchableOpacity style={styles.saveBottomBtn} onPress={handleSave}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.saveBottomText}>Save Changes</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Not found
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 18,
    color: Colors.textSecondary,
  },
  backLink: {
    fontSize: 15,
    color: Colors.accent,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  headerMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  saveBtn: {
    backgroundColor: Colors.accent,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },

  // Summary bar
  summaryBar: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginVertical: 4,
  },
  summaryValue: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textMuted,
  },

  // Scroll
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
    gap: 14,
  },

  // Exercise card
  exCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    overflow: 'hidden',
  },
  exHeader: {
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

  // Set table
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.surfaceElevated,
  },
  colHdr: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textMuted,
    letterSpacing: 0.6,
    textAlign: 'center',
  },
  colSet: { width: 36, textAlign: 'center' },
  colInput: { flex: 1, textAlign: 'center' },
  colDel: { width: 32, alignItems: 'center' },

  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  setNum: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  setInput: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 8,
    paddingVertical: 7,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginHorizontal: 4,
  },

  // Add set
  addSetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 11,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  addSetText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.accent,
  },

  // Save bottom
  saveBottomBtn: {
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
  saveBottomText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
