import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

const STATS = [
  { label: 'Total Workouts', value: '47' },
  { label: 'Best Streak', value: '21 days' },
  { label: 'Total Volume', value: '142k lbs' },
];

type MenuItem = {
  icon: string;
  label: string;
  route?: string;
};

const MENU_ITEMS: MenuItem[] = [
  { icon: 'trophy-outline', label: 'Personal Records', route: '/prs' },
  { icon: 'bar-chart-outline', label: 'Progress Charts' },
  { icon: 'settings-outline', label: 'Settings' },
];

export default function ProfileScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar + name */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color={Colors.textSecondary} />
          </View>
          <Text style={styles.name}>Liam</Text>
          <Text style={styles.since}>Training since Jan 2024</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {STATS.map((s, i) => (
            <View key={i} style={[styles.statCell, i > 0 && styles.statBorder]}>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Menu */}
        <View style={styles.menu}>
          {MENU_ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.menuItem, i > 0 && styles.menuBorder]}
              onPress={() => item.route && router.push(item.route as '/prs')}
            >
              <View style={styles.menuLeft}>
                <Ionicons
                  name={item.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={20}
                  color={Colors.accent}
                />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 3,
    borderColor: Colors.accent,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  since: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 18,
    marginBottom: 28,
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
  menu: {
    backgroundColor: Colors.surface,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  menuBorder: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  menuLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
