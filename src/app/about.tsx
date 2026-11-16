import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

export default function AboutScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));
  const soon = (label: string) =>
    Alert.alert(label, 'Ce document sera publié prochainement.');

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading">{t('settings.about')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Mascot size={48} />
          </View>
          <Text variant="title">Quizylo</Text>
          <Text variant="small" color={Palette.textSecondary}>
            Ton assistant de révision
          </Text>
          <Text variant="caption" color={Palette.textMuted} style={{ marginTop: Spacing.xs }}>
            Version 1.0.0
          </Text>
        </View>

        <View style={styles.card}>
          <Tappable
            style={[styles.row, styles.rowBorder]}
            onPress={() => soon("Conditions d'utilisation")}
            haptic={false}>
            <Ionicons name="document-text-outline" size={22} color={Palette.textSecondary} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              Conditions d'utilisation
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
          </Tappable>
          <Tappable
            style={styles.row}
            onPress={() => soon('Politique de confidentialité')}
            haptic={false}>
            <Ionicons name="shield-outline" size={22} color={Palette.textSecondary} />
            <Text variant="bodyStrong" style={{ flex: 1 }}>
              Politique de confidentialité
            </Text>
            <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
          </Tappable>
        </View>

        <Text variant="caption" color={Palette.textMuted} center style={{ marginTop: Spacing.xl }}>
          Fait avec soin pour t'aider à réussir.
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
  hero: { alignItems: 'center', paddingVertical: Spacing.xl, gap: 2 },
  logo: {
    width: 84,
    height: 84,
    borderRadius: 24,
    backgroundColor: Palette.purpleSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.md,
  },
  card: { backgroundColor: Palette.surface, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md + 2 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Palette.border },
});
