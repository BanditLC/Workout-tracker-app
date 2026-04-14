import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

type PREntry = {
  exercise: string;
  muscleGroup: string;
  weight: string;
  reps: number;
  date: string;
};

const PERSONAL_RECORDS: PREntry[] = [
  { exercise: 'Bench Press', muscleGroup: 'Chest', weight: '225', reps: 1, date: 'Mar 15' },
  { exercise: 'Squat', muscleGroup: 'Legs', weight: '275', reps: 1, date: 'Feb 28' },
  { exercise: 'Deadlift', muscleGroup: 'Back', weight: '365', reps: 1, date: 'Apr 1' },
  { exercise: 'Overhead Press', muscleGroup: 'Shoulders', weight: '145', reps: 1, date: 'Mar 22' },
  { exercise: 'Barbell Row', muscleGroup: 'Back', weight: '185', reps: 5, date: 'Mar 10' },
  { exercise: 'Incline Bench Press', muscleGroup: 'Chest', weight: '185', reps: 3, date: 'Jan 18' },
  { exercise: 'Romanian Deadlift', muscleGroup: 'Legs', weight: '255', reps: 6, date: 'Feb 14' },
  { exercise: 'Barbell Curl', muscleGroup: 'Biceps', weight: '115', reps: 5, date: 'Mar 5' },
];

const GROUP_COLORS: Record<string, string> = {
  Chest: '#E53935',
  Back: '#8B5CF6',
  Legs: '#10B981',
  Shoulders: '#F59E0B',
  Biceps: '#3B82F6',
  Triceps: '#EC4899',
  Core: '#6B7280',
};

export default function PRsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Personal Records</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Trophy banner */}
      <View style={styles.banner}>
        <Ionicons name="trophy" size={28} color={Colors.accent} />
        <View>
          <Text style={styles.bannerTitle}>{PERSONAL_RECORDS.length} PRs tracked</Text>
          <Text style={styles.bannerSub}>Latest: Deadlift 365 lbs · Apr 1</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {PERSONAL_RECORDS.map((pr, i) => {
          const color = GROUP_COLORS[pr.muscleGroup] ?? Colors.accent;
          return (
            <View key={i} style={styles.card}>
              <View style={[styles.badge, { backgroundColor: color + '22' }]}>
                <Text style={[styles.badgeText, { color }]}>
                  {pr.muscleGroup.slice(0, 3).toUpperCase()}
                </Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.exerciseName}>{pr.exercise}</Text>
                <Text style={styles.exerciseMeta}>Set on {pr.date}</Text>
              </View>
              <View style={styles.prValue}>
                <Text style={styles.prWeight}>{pr.weight}</Text>
                <Text style={styles.prUnit}>lbs</Text>
                {pr.reps > 1 && (
                  <Text style={styles.prReps}>× {pr.reps}</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: Colors.surface,
    margin: 16,
    borderRadius: 14,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: Colors.accent,
  },
  bannerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  bannerSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  badge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardInfo: {
    flex: 1,
    gap: 3,
  },
  exerciseName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  exerciseMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  prValue: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: 3,
    alignSelf: 'center',
  },
  prWeight: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.accent,
  },
  prUnit: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 3,
    alignSelf: 'flex-end',
  },
  prReps: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 3,
    alignSelf: 'flex-end',
  },
});
