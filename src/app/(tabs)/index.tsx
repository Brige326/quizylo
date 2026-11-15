import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

type Action = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string };

const ACTIONS: Action[] = [
  { key: 'resoudre', label: 'Résoudre', icon: 'camera', color: Palette.info },
  { key: 'quiz', label: 'Quiz', icon: 'help-circle', color: '#FF4D8D' },
  { key: 'examen', label: 'Examen blanc', icon: 'document-text', color: '#5B8CFF' },
  { key: 'resume', label: 'Résumer', icon: 'reader', color: Palette.primary },
  { key: 'redaction', label: 'Rédaction', icon: 'create', color: Palette.purple },
  { key: 'rechercher', label: 'Rechercher', icon: 'search', color: '#2DD4BF' },
  { key: 'aide', label: 'Aide-mémoire', icon: 'albums', color: Palette.streak },
  { key: 'vocab', label: 'Vocabulaire', icon: 'language', color: '#F5B301' },
  { key: 'image', label: 'Créer une image', icon: 'image', color: '#A855F7' },
];

export default function AccueilScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  return (
    <Screen>
      <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} />

      {/* Zone centrale : hero */}
      <View style={styles.center}>
        <View style={styles.heroWrap}>
          <View style={styles.mascotWrap}>
            <Mascot size={78} />
          </View>
          <View style={styles.heroCard}>
            <Text variant="title" center style={styles.heroTitle}>
              Entraîne-toi avec de vrais examens blancs.
            </Text>
          </View>
          <Tappable style={styles.cta} onPress={() => comingSoon('Créer un examen blanc')}>
            <Text variant="bodyStrong" color={Palette.background}>
              Créer un examen blanc
            </Text>
          </Tappable>
        </View>
      </View>

      {/* Actions rapides */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}>
        {ACTIONS.map((a) => (
          <Tappable key={a.key} style={styles.chip} onPress={() => comingSoon(a.label)}>
            <Ionicons name={a.icon} size={16} color={a.color} />
            <Text variant="small">{a.label}</Text>
          </Tappable>
        ))}
      </ScrollView>

      {/* Barre de chat */}
      <View style={styles.chatRow}>
        <Tappable
          style={styles.plus}
          onPress={() => comingSoon('Pièce jointe')}
          accessibilityLabel="Ajouter"
          scaleTo={0.9}>
          <Ionicons name="add" size={24} color={Palette.text} />
        </Tappable>
        <Tappable style={styles.chatBar} onPress={() => router.push('/chat')} haptic={false}>
          <Text variant="body" color={Palette.textMuted} style={styles.chatPlaceholder}>
            Demande à Quizylo…
          </Text>
          <Ionicons name="camera-outline" size={20} color={Palette.textSecondary} />
          <Ionicons name="mic-outline" size={20} color={Palette.textSecondary} />
        </Tappable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', paddingHorizontal: Spacing.lg },
  heroWrap: { alignItems: 'center' },
  mascotWrap: { zIndex: 2, marginBottom: -Spacing.lg },
  heroCard: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.xl,
    paddingTop: Spacing.xxl,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    alignSelf: 'stretch',
  },
  heroTitle: { fontSize: 24, lineHeight: 30 },
  cta: {
    backgroundColor: '#F4F4F5',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  chips: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  chatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  plus: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    height: 48,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
  },
  chatPlaceholder: { flex: 1 },
});
