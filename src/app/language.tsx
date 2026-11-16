import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { LANGUAGES, useI18n } from '@/lib/i18n';

export default function LanguageScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { lang, setLang, t } = useI18n();

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading">{t('language.title')}</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
        <Text variant="small" color={Palette.textSecondary} style={{ marginBottom: Spacing.lg }}>
          {t('language.subtitle')}
        </Text>

        <View style={styles.card}>
          {LANGUAGES.map((l) => {
            const active = l.code === lang;
            return (
              <Tappable key={l.code} style={styles.row} onPress={() => setLang(l.code)} haptic={false}>
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {l.label}
                </Text>
                {active ? (
                  <Ionicons name="checkmark-circle" size={22} color={Palette.primary} />
                ) : (
                  <View style={styles.radio} />
                )}
              </Tappable>
            );
          })}
        </View>

        <Text variant="caption" color={Palette.textMuted} style={{ marginTop: Spacing.lg }}>
          D'autres langues seront ajoutées prochainement.
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
  card: { backgroundColor: Palette.surface, borderRadius: Radius.lg, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Palette.border,
  },
});
