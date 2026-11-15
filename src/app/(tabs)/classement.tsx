import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';

const LEAGUES: Record<string, { label: string; color: string }> = {
  bronze: { label: 'Ligue Bronze', color: '#CD7F32' },
  argent: { label: 'Ligue Argent', color: '#C0C0C0' },
  or: { label: 'Ligue Or', color: Palette.gold },
};

export default function ClassementScreen() {
  const { profile } = useAuth();
  const league = LEAGUES[profile?.league ?? 'bronze'] ?? LEAGUES.bronze;
  const initial = (profile?.full_name || profile?.username || '?').trim().charAt(0).toUpperCase();

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Ionicons name="trophy" size={28} color={league.color} />
        <Text variant="title">{league.label}</Text>
      </View>

      {/* Carte de rang — données réelles du profil, aucune invention */}
      <View style={styles.meCard}>
        <View style={[styles.avatar, { backgroundColor: Palette.purpleSurface }]}>
          <Text variant="bodyStrong" color={Palette.purple}>
            {initial || '?'}
          </Text>
        </View>
        <View style={styles.meInfo}>
          <Text variant="bodyStrong">{profile?.full_name || 'Toi'}</Text>
          <Text variant="small" color={Palette.textSecondary}>
            Ton classement démarre à partir de tes premiers XP
          </Text>
        </View>
        <View style={styles.xpPill}>
          <Ionicons name="diamond" size={13} color={Palette.info} />
          <Text variant="bodyStrong">{profile?.xp ?? 0} XP</Text>
        </View>
      </View>

      <EmptyState
        icon="podium-outline"
        title="Le classement se remplit bientôt"
        subtitle="Gagne des XP en révisant : tu monteras dans la ligue et tu rejoindras la zone de promotion."
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.lg,
  },
  meCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  meInfo: { flex: 1, gap: 2 },
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
