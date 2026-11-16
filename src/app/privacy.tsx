import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

const POINTS = [
  {
    icon: 'lock-closed-outline' as const,
    title: 'Tes données t’appartiennent',
    desc: 'Tes discussions et préférences ne sont visibles que par toi.',
  },
  {
    icon: 'server-outline' as const,
    title: 'Stockage sécurisé',
    desc: 'Tes données sont protégées par des règles d’accès strictes (chaque compte ne voit que les siennes).',
  },
  {
    icon: 'eye-off-outline' as const,
    title: 'Pas de revente',
    desc: 'Tes informations ne sont jamais vendues à des tiers.',
  },
  {
    icon: 'trash-outline' as const,
    title: 'Contrôle total',
    desc: 'Tu peux supprimer toutes tes discussions à tout moment depuis les Paramètres.',
  },
];

export default function PrivacyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading">{t('settings.dataProtection')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
        <Text variant="small" color={Palette.textSecondary} style={{ marginBottom: Spacing.lg }}>
          Voici comment Quizylo protège tes données.
        </Text>
        <View style={styles.card}>
          {POINTS.map((p, i) => (
            <View key={p.title} style={[styles.row, i < POINTS.length - 1 && styles.rowBorder]}>
              <Ionicons name={p.icon} size={22} color={Palette.primary} />
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong">{p.title}</Text>
                <Text variant="small" color={Palette.textSecondary}>
                  {p.desc}
                </Text>
              </View>
            </View>
          ))}
        </View>
        <Text variant="caption" color={Palette.textMuted} style={{ marginTop: Spacing.lg }}>
          La politique de confidentialité complète sera publiée prochainement.
        </Text>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  card: { backgroundColor: Palette.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md + 2,
  },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Palette.border },
});
