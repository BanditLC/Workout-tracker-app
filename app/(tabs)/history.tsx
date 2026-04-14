import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';
import { WORKOUT_HISTORY } from '@/constants/mockData';

export default function HistoryScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>{WORKOUT_HISTORY.length} workouts logged</Text>
      </View>

      <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
        {WORKOUT_HISTORY.map((item) => {
          const totalSets = item.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
          return (
            <TouchableOpacity
              key={item.id}
              style={styles.card}
              activeOpacity={0.75}
              onPress={() => router.push({ pathname: '/workout/[id]', params: { id: item.id } })}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconBox}>
                  <Ionicons name="barbell-outline" size={22} color={Colors.accent} />
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <Text style={styles.cardMeta}>
                    {item.exercises.length} exercises · {totalSets} sets · {item.duration}
                  </Text>
                </View>
              </View>
              <View style={styles.cardRight}>
                <Text style={styles.cardDate}>{item.dateLabel}</Text>
                <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
              </View>
            </TouchableOpacity>
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
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  list: {
    padding: 16,
    gap: 10,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 44,
    height: 44,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    gap: 4,
    flex: 1,
  },
  cardName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  cardMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
});
