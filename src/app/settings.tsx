import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Mascot } from '@/components/ui/Mascot';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';

export default function SettingsScreen() {
  const { session, profile, isGuest, signOut, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const email = session?.user?.email ?? '';
  const name = isGuest ? 'Invité' : profile?.full_name || 'Mon compte';
  const handle = isGuest ? '@invité' : '@' + (profile?.username || email.split('@')[0] || 'moi');

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  // Honnête : les sections dont la brique n'existe pas encore arrivent dans les prochaines séances.
  const soon = (label: string) =>
    Alert.alert(label, 'Cette section arrive dans une prochaine étape — on la construit juste après.');

  const about = () =>
    Alert.alert('À propos de Quizylo', 'Quizylo — ton assistant de révision.\nVersion 1.0.0');

  const onSignIn = () => {
    exitGuest();
    router.replace('/(auth)/login');
  };

  const onSignOut = () =>
    Alert.alert('Se déconnecter', 'Veux-tu vraiment te déconnecter ?', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);

  return (
    <Screen>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <Text variant="heading">Paramètres</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}>
        {/* Carte profil */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Mascot size={34} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="title">{name}</Text>
            <Text variant="small" color={Palette.textSecondary}>
              {isGuest ? 'Non connecté' : email || handle}
            </Text>
          </View>
          {isGuest ? (
            <Tappable style={styles.signInBtn} onPress={onSignIn}>
              <Text variant="bodyStrong" color={Palette.onPrimary}>
                Se connecter
              </Text>
            </Tappable>
          ) : null}
        </View>

        <Section title="Compte">
          <Row icon="person-outline" label="Mes informations" onPress={() => soon('Mes informations')} />
          <Row
            icon="star-outline"
            label="Abonnement"
            value="Gratuit"
            onPress={() => router.push('/pro')}
          />
        </Section>

        <Section title="IA & discussions">
          <Row icon="sparkles-outline" label="Mémoire de l'IA" onPress={() => soon("Mémoire de l'IA")} />
          <Row
            icon="trash-outline"
            label="Supprimer toutes les discussions"
            danger
            onPress={() => soon('Supprimer toutes les discussions')}
          />
        </Section>

        <Section title="Préférences">
          <Row icon="language-outline" label="Langue" value="Français" onPress={() => soon('Langue')} />
          <Row icon="notifications-outline" label="Notifications" onPress={() => soon('Notifications')} />
        </Section>

        <Section title="Confidentialité & aide">
          <Row
            icon="shield-checkmark-outline"
            label="Protection des données"
            onPress={() => soon('Protection des données')}
          />
          <Row
            icon="help-buoy-outline"
            label="Contacter l'assistance"
            onPress={() => soon("Contacter l'assistance")}
          />
          <Row icon="information-circle-outline" label="À propos" onPress={about} />
        </Section>

        {!isGuest ? (
          <Section>
            <Row icon="log-out-outline" label="Se déconnecter" danger onPress={onSignOut} />
          </Section>
        ) : null}

        <Text variant="caption" color={Palette.textMuted} center style={{ marginTop: Spacing.lg }}>
          Quizylo · Version 1.0.0
        </Text>
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      {title ? (
        <Text variant="small" color={Palette.textMuted} style={styles.sectionTitle}>
          {title.toUpperCase()}
        </Text>
      ) : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

function Row({
  icon,
  label,
  value,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  danger?: boolean;
  onPress: () => void;
}) {
  const color = danger ? Palette.danger : Palette.text;
  return (
    <Tappable style={styles.row} onPress={onPress} haptic={false}>
      <Ionicons name={icon} size={22} color={danger ? Palette.danger : Palette.textSecondary} />
      <Text variant="bodyStrong" color={color} style={{ flex: 1 }}>
        {label}
      </Text>
      {value ? (
        <Text variant="small" color={Palette.textSecondary}>
          {value}
        </Text>
      ) : null}
      {!danger ? (
        <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
      ) : null}
    </Tappable>
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
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Palette.purpleSurface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  signInBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
  },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { marginLeft: Spacing.lg + Spacing.md, marginBottom: Spacing.xs, letterSpacing: 0.6 },
  card: {
    marginHorizontal: Spacing.lg,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
});
