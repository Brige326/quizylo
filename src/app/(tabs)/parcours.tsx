import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Mascot } from '@/components/ui/Mascot';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { TopBar } from '@/components/TopBar';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

type StepState = 'completed' | 'current' | 'locked';
type Step = { id: string; icon: keyof typeof Ionicons.glyphMap; state: StepState };

// Exemple d'aperçu (mode invité uniquement) — clairement étiqueté, jamais présenté comme réel.
const DEMO = {
  title: 'Exam de Marketing',
  sessionLabel: 'Session 1 · Aujourd’hui',
  sessionTitle: 'Repères du digital',
  progress: 0.3,
  nextTitle: 'Canaux numériques',
  steps: [
    { id: 's1', icon: 'checkmark', state: 'completed' },
    { id: 's2', icon: 'document-text', state: 'current' },
    { id: 's3', icon: 'document-text', state: 'locked' },
    { id: 's4', icon: 'mic', state: 'locked' },
    { id: 's5', icon: 'bulb', state: 'locked' },
  ] as Step[],
};

const OFFSETS = [0, 54, -40, 46, -30];

export default function ParcoursScreen() {
  const { profile, isGuest } = useAuth();

  if (!isGuest) {
    return (
      <Screen>
        <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} />
        <EmptyState
          icon="trail-sign-outline"
          title="Ton parcours commence ici"
          subtitle="Crée ta première matière pour générer un parcours de révision guidé, étape par étape.">
          <Button label="Créer un parcours" onPress={() => comingSoon('Parcours de cours')} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* En-tête du parcours */}
      <View style={styles.header}>
        <Ionicons name="menu" size={24} color={Palette.text} />
        <View style={styles.headerCenter}>
          <Text variant="heading">{DEMO.title}</Text>
          <View style={styles.apercuBadge}>
            <Text variant="caption" color={Palette.textSecondary}>
              APERÇU
            </Text>
          </View>
        </View>
        <Ionicons name="ellipsis-horizontal" size={22} color={Palette.text} />
      </View>

      {/* Bandeau de session */}
      <View style={styles.sessionBanner}>
        <View style={styles.sessionTop}>
          <View style={{ flex: 1 }}>
            <Text variant="caption" color={Palette.onPrimary}>
              {DEMO.sessionLabel}
            </Text>
            <Text variant="heading" color={Palette.onPrimary}>
              {DEMO.sessionTitle}
            </Text>
          </View>
          <Ionicons name="book" size={22} color={Palette.onPrimary} />
        </View>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${DEMO.progress * 100}%` }]} />
        </View>
      </View>

      {/* Chemin */}
      <ScrollView contentContainerStyle={styles.path} showsVerticalScrollIndicator={false}>
        <View style={styles.spine} />
        {DEMO.steps.map((step, i) => (
          <View key={step.id} style={[styles.nodeRow, { transform: [{ translateX: OFFSETS[i % OFFSETS.length] }] }]}>
            <PathNode step={step} />
            {step.state === 'current' ? (
              <View style={styles.mascotPeek}>
                <Mascot size={34} />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      {/* Carte Continuer */}
      <View style={styles.continueCard}>
        <Text variant="heading" color={Palette.primary} center>
          {DEMO.nextTitle}
        </Text>
        <Tappable style={styles.continueBtn} onPress={() => comingSoon('Leçon du parcours')}>
          <Text variant="bodyStrong" color={Palette.background}>
            Continuer
          </Text>
        </Tappable>
      </View>
    </Screen>
  );
}

function PathNode({ step }: { step: Step }) {
  const isCompleted = step.state === 'completed';
  const isCurrent = step.state === 'current';
  const bg = isCompleted ? Palette.gold : isCurrent ? Palette.primary : Palette.surfaceElevated;
  const iconColor = isCompleted
    ? '#3A2A00'
    : isCurrent
      ? Palette.onPrimary
      : Palette.textMuted;

  return (
    <View style={[styles.node, isCurrent && styles.nodeCurrentRing]}>
      <View style={[styles.nodeInner, { backgroundColor: bg }]}>
        <Ionicons
          name={step.state === 'locked' ? 'lock-closed' : step.icon}
          size={26}
          color={iconColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
  },
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  apercuBadge: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sessionBanner: {
    backgroundColor: Palette.primary,
    marginHorizontal: Spacing.lg,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  sessionTop: { flexDirection: 'row', alignItems: 'center' },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(0,0,0,0.25)',
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: Palette.onPrimary },
  path: {
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
    gap: Spacing.xxl,
  },
  spine: {
    position: 'absolute',
    top: Spacing.xxl,
    bottom: Spacing.xxl,
    width: 4,
    borderRadius: 2,
    backgroundColor: Palette.borderSubtle,
  },
  nodeRow: { alignItems: 'center', justifyContent: 'center' },
  node: { alignItems: 'center', justifyContent: 'center' },
  nodeCurrentRing: {
    padding: 5,
    borderRadius: Radius.pill,
    borderWidth: 3,
    borderColor: Palette.surfaceSelected,
  },
  nodeInner: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mascotPeek: { position: 'absolute', right: -22, bottom: -4 },
  continueCard: {
    backgroundColor: Palette.primarySurface,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  continueBtn: {
    backgroundColor: '#F4F4F5',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
