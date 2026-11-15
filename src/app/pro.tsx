import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { comingSoon } from '@/lib/ui';

const BENEFITS = [
  'Réponses IA illimitées',
  'Examens blancs & quiz illimités',
  'Parcours de révision avancés',
  'Résumés et fiches en un clic',
  'Sans publicité',
  'Support prioritaire',
];

export default function ProScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Pressable hitSlop={10} onPress={() => router.back()} accessibilityLabel="Fermer">
          <Ionicons name="close" size={26} color={Palette.text} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Mascot size={84} />
          <View style={styles.proTitleRow}>
            <Text variant="display">Quizylo</Text>
            <View style={styles.proBadge}>
              <Text variant="bodyStrong" color="#fff">
                PRO
              </Text>
            </View>
          </View>
          <Text variant="body" color={Palette.textSecondary} center style={{ maxWidth: 300 }}>
            Passe à la vitesse supérieure : révise plus vite, sans limite, avec toute la
            puissance de Quizylo.
          </Text>
        </View>

        <View style={styles.card}>
          {BENEFITS.map((b) => (
            <View key={b} style={styles.benefit}>
              <View style={styles.check}>
                <Ionicons name="checkmark" size={15} color={Palette.onPrimary} />
              </View>
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {b}
              </Text>
            </View>
          ))}
        </View>

        <Text variant="small" color={Palette.textMuted} center style={{ marginTop: Spacing.lg }}>
          Les offres et le paiement seront activés prochainement.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, Spacing.md) }]}>
        <Tappable style={styles.cta} onPress={() => comingSoon('Abonnement PRO')}>
          <Text variant="bodyStrong" color={Palette.background}>
            Débloquer Quizylo PRO
          </Text>
        </Tappable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  header: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, alignItems: 'flex-start' },
  content: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xxl, alignItems: 'center' },
  hero: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl },
  proTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  proBadge: {
    backgroundColor: Palette.purple,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  check: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
  },
  cta: {
    backgroundColor: '#F4F4F5',
    borderRadius: Radius.pill,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
  },
});
