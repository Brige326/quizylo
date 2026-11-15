import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';

export default function ClassementScreen() {
  const { profile } = useAuth();
  const initial = (profile?.full_name || 'T').trim().charAt(0).toUpperCase();

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text variant="title">Ligue Bronze</Text>
          <Text variant="small" color={Palette.textSecondary}>
            Gagne des XP pour entrer dans la course
          </Text>
        </View>
      </View>

      <View style={styles.trophies}>
        <View style={[styles.trophy, styles.trophyActive]}>
          <Ionicons name="trophy" size={34} color="#CD7F32" />
        </View>
        {[0, 1].map((i) => (
          <View key={i} style={styles.trophy}>
            <Ionicons name="lock-closed" size={22} color={Palette.textMuted} />
          </View>
        ))}
      </View>

      {/* Carte de rang — données réelles du profil (0 par défaut), aucune invention */}
      <View style={styles.meCard}>
        <View style={styles.avatar}>
          <Text variant="bodyStrong" color={Palette.purple}>
            {initial}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text variant="bodyStrong">{profile?.full_name || 'Toi'}</Text>
          <Text variant="small" color={Palette.textSecondary}>
            Ton classement démarre dès tes premiers XP
          </Text>
        </View>
        <View style={styles.xpPill}>
          <Ionicons name="flash" size={13} color={Palette.info} />
          <Text variant="bodyStrong">{profile?.xp ?? 0} XP</Text>
        </View>
      </View>

      <EmptyState
        icon="podium-outline"
        title="Le classement se remplit bientôt"
        subtitle="Gagne des XP en révisant : tu monteras dans la ligue et rejoindras la zone de promotion."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.md },
  trophies: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  trophy: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  trophyActive: { width: 84, height: 84, borderRadius: 42, backgroundColor: 'rgba(205,127,50,0.12)' },
  meCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.purpleSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
});
