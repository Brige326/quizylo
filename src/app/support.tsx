import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

const SUPPORT_EMAIL = 'support@quizylo.app';

export default function SupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  const email = () =>
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Aide Quizylo')}`,
    ).catch(() => {});

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading">{t('settings.support')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
        <Text variant="small" color={Palette.textSecondary} style={{ marginBottom: Spacing.lg }}>
          Une question, un souci, une idée ? On est là pour t'aider.
        </Text>

        <Tappable style={styles.card} onPress={email} haptic={false}>
          <View style={styles.iconBox}>
            <Ionicons name="mail-outline" size={22} color={Palette.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="bodyStrong">Nous écrire par email</Text>
            <Text variant="small" color={Palette.textSecondary}>
              {SUPPORT_EMAIL}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
        </Tappable>

        <Text variant="caption" color={Palette.textMuted} style={{ marginTop: Spacing.lg }}>
          On te répond généralement sous 48 h. (Adresse d'assistance à confirmer avant la mise en
          ligne.)
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
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Palette.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
