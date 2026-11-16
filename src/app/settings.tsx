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
import { setCachedConversations, startNewChat } from '@/lib/chatNav';
import { LANGUAGES, useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';

export default function SettingsScreen() {
  const { session, profile, isGuest, signOut, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, lang } = useI18n();
  const currentLang = LANGUAGES.find((l) => l.code === lang)?.label ?? 'Français';

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

  const onSignIn = () => {
    exitGuest();
    router.replace('/(auth)/login');
  };

  const deleteAllChats = () => {
    const userId = session?.user?.id;
    if (isGuest || !userId) {
      soon(t('settings.deleteAll'));
      return;
    }
    Alert.alert(t('settings.deleteAll'), t('settings.deleteAllConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await supabase.from('messages').delete().eq('user_id', userId);
          await supabase.from('conversations').delete().eq('user_id', userId);
          setCachedConversations([]);
          startNewChat();
          Alert.alert(t('settings.deleteAllDone'));
        },
      },
    ]);
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
        <Text variant="heading">{t('settings.title')}</Text>
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
              {isGuest ? t('settings.notConnected') : email || handle}
            </Text>
          </View>
          {isGuest ? (
            <Tappable style={styles.signInBtn} onPress={onSignIn}>
              <Text variant="bodyStrong" color={Palette.onPrimary}>
                {t('settings.signIn')}
              </Text>
            </Tappable>
          ) : null}
        </View>

        <Section title={t('settings.account')}>
          <Row
            icon="person-outline"
            label={t('settings.myInfo')}
            onPress={() => router.push('/account')}
          />
          <Row
            icon="star-outline"
            label={t('settings.subscription')}
            value={profile?.is_pro ? 'PRO' : t('settings.free')}
            onPress={() => router.push('/abonnement')}
          />
        </Section>

        <Section title={t('settings.aiDiscussions')}>
          <Row
            icon="sparkles-outline"
            label={t('settings.aiMemory')}
            onPress={() => router.push('/ai-memory')}
          />
          <Row
            icon="trash-outline"
            label={t('settings.deleteAll')}
            danger
            onPress={deleteAllChats}
          />
        </Section>

        <Section title={t('settings.prefs')}>
          <Row
            icon="language-outline"
            label={t('settings.language')}
            value={currentLang}
            onPress={() => router.push('/language')}
          />
          <Row
            icon="notifications-outline"
            label={t('settings.notifications')}
            onPress={() => router.push('/notifications')}
          />
        </Section>

        <Section title={t('settings.privacyHelp')}>
          <Row
            icon="shield-checkmark-outline"
            label={t('settings.dataProtection')}
            onPress={() => router.push('/privacy')}
          />
          <Row
            icon="help-buoy-outline"
            label={t('settings.support')}
            onPress={() => router.push('/support')}
          />
          <Row
            icon="information-circle-outline"
            label={t('settings.about')}
            onPress={() => router.push('/about')}
          />
        </Section>

        {!isGuest ? (
          <Section>
            <Row icon="log-out-outline" label={t('settings.signOut')} danger onPress={onSignOut} />
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
