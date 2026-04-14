import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

const WEEK_PLAN = [
  { day: 'Monday', workout: 'Upper Body Push', tag: 'Chest · Shoulders · Triceps', scheduled: true },
  { day: 'Tuesday', workout: 'Leg Day', tag: 'Quads · Hamstrings · Calves', scheduled: true },
  { day: 'Wednesday', workout: 'Rest', tag: 'Recovery', scheduled: false },
  { day: 'Thursday', workout: 'Pull Day', tag: 'Back · Biceps', scheduled: true },
  { day: 'Friday', workout: 'Upper Body Push', tag: 'Chest · Shoulders · Triceps', scheduled: true },
  { day: 'Saturday', workout: 'Full Body', tag: 'Compound movements', scheduled: true },
  { day: 'Sunday', workout: 'Rest', tag: 'Recovery', scheduled: false },
];

const TODAY_DOW = new Date().toLocaleDateString('en-US', { weekday: 'long' });

export default function ScheduleScreen() {
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
        <Text style={styles.title}>Weekly Schedule</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>This Week</Text>

        {WEEK_PLAN.map((item, i) => {
          const isToday = item.day === TODAY_DOW;
          return (
            <View
              key={i}
              style={[styles.card, isToday && styles.cardToday]}
            >
              <View style={styles.dayCol}>
                <Text style={[styles.dayText, isToday && styles.dayTextToday]}>
                  {item.day.slice(0, 3).toUpperCase()}
                </Text>
                {isToday && <View style={styles.todayDot} />}
              </View>

              <View style={styles.divider} />

              <View style={styles.workoutInfo}>
                <Text style={[styles.workoutName, !item.scheduled && styles.restText]}>
                  {item.workout}
                </Text>
                <Text style={styles.workoutTag}>{item.tag}</Text>
              </View>

              {item.scheduled && (
                <TouchableOpacity style={styles.startBtn}>
                  <Ionicons name="play" size={14} color={Colors.accent} />
                </TouchableOpacity>
              )}
            </View>
          );
        })}

        <TouchableOpacity style={styles.editBtn}>
          <Ionicons name="create-outline" size={18} color={Colors.accent} />
          <Text style={styles.editBtnText}>Edit Schedule</Text>
        </TouchableOpacity>
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
    fontSize: 12,
    color: Colors.textSecondary,
  },
  startBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 6,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  editBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accent,
  },
});
