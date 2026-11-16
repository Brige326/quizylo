import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Spacing, Type } from '@/constants/theme';
import { useI18n } from '@/lib/i18n';

export default function AboutScreen() {
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

        <Text style={styles.paragraph}>
          Quizylo est ton compagnon de révision propulsé par l'intelligence artificielle. Pose une
          question, envoie une photo d'un exercice ou lance un quiz : Quizylo t'aide à comprendre tes
          cours, à t'entraîner et à préparer tes examens, à ton rythme.
        </Text>
        <Text style={styles.paragraph}>
          Résoudre un problème, créer un quiz ou un examen blanc, résumer un chapitre, te faire des
          aides-mémoire — tout est pensé pour rendre tes révisions plus simples, plus claires et plus
          efficaces.
        </Text>
        <Text style={styles.paragraph}>
          Notre objectif est simple : t'accompagner vers la réussite, où que tu sois et dans ta
          langue.
        </Text>

        <Text variant="caption" color={Palette.textMuted} center style={{ marginTop: Spacing.lg }}>
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
  paragraph: {
    ...Type.body,
    color: Palette.textSecondary,
    lineHeight: 23,
    marginBottom: Spacing.md,
  },
});
