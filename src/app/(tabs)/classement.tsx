import { Ionicons } from '@expo/vector-icons';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { EmptyState } from '@/components/ui/EmptyState';
import { Mascot } from '@/components/ui/Mascot';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

type Rank = { rank: number; name: string; initial: string; xp: number; me?: boolean };

// Aperçu (mode invité) — exemple clairement étiqueté, jamais présenté comme réel.
const DEMO_RANKS: Rank[] = [
  { rank: 4, name: 'Layline', initial: 'L', xp: 131 },
  { rank: 5, name: 'Aya', initial: 'A', xp: 63 },
  { rank: 6, name: 'Rachel', initial: 'R', xp: 62 },
  { rank: 7, name: 'Toi', initial: 'T', xp: 54, me: true },
  { rank: 8, name: 'Emma', initial: 'E', xp: 53 },
  { rank: 9, name: 'Anna', initial: 'A', xp: 48 },
  { rank: 10, name: 'Ranim', initial: 'R', xp: 46 },
  { rank: 11, name: 'Yasmine', initial: 'Y', xp: 37 },
];
const PROMOTION_AFTER_RANK = 5;

function LeagueHeader({ apercu }: { apercu?: boolean }) {
  return (
    <>
      <View style={styles.titleRow}>
        <View>
          <Text variant="title">Ligue Bronze</Text>
          <Text variant="small" color={Palette.textSecondary}>
            {apercu ? 'Classement hebdomadaire' : 'Gagne des XP pour entrer dans la course'}
          </Text>
        </View>
        {apercu ? (
          <View style={styles.apercuBadge}>
            <Text variant="caption" color={Palette.textSecondary}>
              APERÇU
            </Text>
          </View>
        ) : null}
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
    </>
  );
}

export default function ClassementScreen() {
  const { profile, isGuest } = useAuth();

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <LeagueHeader apercu={isGuest} />
      </View>

      {isGuest ? (
        <>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {DEMO_RANKS.map((r, i) => (
              <Fragment key={r.rank}>
                {i > 0 && DEMO_RANKS[i - 1].rank === PROMOTION_AFTER_RANK ? (
                  <View style={styles.promoRow}>
                    <Ionicons name="chevron-up" size={16} color={Palette.info} />
                    <Text variant="caption" color={Palette.info}>
                      ZONE DE PROMOTION
                    </Text>
                    <Ionicons name="chevron-up" size={16} color={Palette.info} />
                  </View>
                ) : null}
                <RankRow r={r} />
              </Fragment>
            ))}
          </ScrollView>

          <View style={styles.footer}>
            <Tappable style={styles.xpBtn} onPress={() => comingSoon('Gagner des XP')}>
              <Text variant="bodyStrong" color={Palette.background}>
                Gagner des XP
              </Text>
              <Ionicons name="flash" size={18} color={Palette.info} />
            </Tappable>
          </View>
        </>
      ) : (
        <>
          <View style={styles.meCard}>
            <View style={styles.avatar}>
              <Text variant="bodyStrong" color={Palette.purple}>
                {(profile?.full_name || 'T').trim().charAt(0).toUpperCase()}
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
        </>
      )}
    </Screen>
  );
}

function RankRow({ r }: { r: Rank }) {
  return (
    <View style={[styles.rankRow, r.me && styles.rankRowMe]}>
      <Text variant="bodyStrong" color={Palette.textSecondary} style={styles.rankNum}>
        {r.rank}
      </Text>
      <View style={[styles.avatar, r.me && styles.avatarMe]}>
        {r.me ? (
          <Mascot size={22} />
        ) : (
          <Text variant="bodyStrong" color={Palette.textSecondary}>
            {r.initial}
          </Text>
        )}
      </View>
      <Text variant="bodyStrong" style={styles.rankName}>
        {r.name}
      </Text>
      <View style={styles.rankXp}>
        <Ionicons name="flash" size={14} color={r.me ? Palette.info : Palette.textMuted} />
        <Text variant="bodyStrong" color={r.me ? Palette.text : Palette.textSecondary}>
          {r.xp} XP
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  apercuBadge: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  trophies: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xl,
    paddingVertical: Spacing.lg,
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
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
  },
  rankRowMe: { backgroundColor: Palette.surface, borderWidth: 1, borderColor: Palette.border },
  rankNum: { width: 22, textAlign: 'center' },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarMe: { backgroundColor: Palette.purpleSurface, borderWidth: 2, borderColor: '#fff' },
  rankName: { flex: 1 },
  rankXp: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  footer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  xpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#F4F4F5',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
  },
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
