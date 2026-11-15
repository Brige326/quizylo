import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';

const PRO_FEATURES = [
  'Réponses IA illimitées',
  'Quiz et examens blancs sans limite',
  'Résumés et aides-mémoire avancés',
  'Priorité sur les nouvelles fonctionnalités',
];

export default function AbonnementScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isPro = !!profile?.is_pro;

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
        <Text variant="heading">Abonnement</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl }}>
        {/* Statut actuel */}
        <View style={styles.statusCard}>
          <View style={styles.statusHead}>
            <Text variant="small" color={Palette.textSecondary}>
              Ton forfait actuel
            </Text>
            <View style={[styles.pill, { backgroundColor: isPro ? Palette.primary : Palette.surfaceSelected }]}>
              <Text variant="caption" color={isPro ? Palette.onPrimary : Palette.textSecondary}>
                {isPro ? 'PRO' : 'GRATUIT'}
              </Text>
            </View>
          </View>
          <Text variant="title" style={{ marginTop: Spacing.xs }}>
            {isPro ? 'Quizylo PRO' : 'Quizylo Gratuit'}
          </Text>
          <Text variant="small" color={Palette.textSecondary} style={{ marginTop: 4 }}>
            {isPro
              ? 'Tu profites de toutes les fonctionnalités avancées.'
              : 'Passe à PRO pour débloquer tout le potentiel de Quizylo.'}
          </Text>
        </View>

        {!isPro ? (
          <>
            <Text variant="bodyStrong" style={{ marginTop: Spacing.lg, marginBottom: Spacing.sm }}>
              Avec PRO, tu obtiens :
            </Text>
            <View style={styles.card}>
              {PRO_FEATURES.map((f) => (
                <View key={f} style={styles.featureRow}>
                  <Ionicons name="checkmark-circle" size={20} color={Palette.primary} />
                  <Text variant="body" style={{ flex: 1 }}>
                    {f}
                  </Text>
                </View>
              ))}
            </View>

            <Tappable style={styles.primaryBtn} onPress={() => router.push('/pro')}>
              <Ionicons name="star" size={18} color={Palette.onPrimary} />
              <Text variant="bodyStrong" color={Palette.onPrimary}>
                Découvrir Quizylo PRO
              </Text>
            </Tappable>
          </>
        ) : null}

        <Text variant="caption" color={Palette.textMuted} center style={{ marginTop: Spacing.lg }}>
          La gestion du paiement et du renouvellement arrivera avec l'activation des abonnements.
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
  statusCard: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  statusHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: { borderRadius: Radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  card: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  primaryBtn: {
    flexDirection: 'row',
    gap: Spacing.sm,
    backgroundColor: Palette.primary,
    borderRadius: Radius.pill,
    paddingVertical: Spacing.md + 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
  },
});
