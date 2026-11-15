import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Mascot } from '@/components/ui/Mascot';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

type Action = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap };

const ACTIONS: Action[] = [
  { key: 'resoudre', label: 'Résoudre', icon: 'bulb-outline' },
  { key: 'quiz', label: 'Quiz', icon: 'help-circle-outline' },
  { key: 'examen', label: 'Examen blanc', icon: 'document-text-outline' },
  { key: 'resume', label: 'Résumer', icon: 'reader-outline' },
  { key: 'redaction', label: 'Rédaction', icon: 'create-outline' },
  { key: 'recherche', label: 'Rechercher', icon: 'search-outline' },
  { key: 'aide', label: 'Aide-mémoire', icon: 'albums-outline' },
  { key: 'vocab', label: 'Vocabulaire', icon: 'language-outline' },
];

export default function AccueilScreen() {
  const { profile, signOut } = useAuth();

  const onMenu = () => {
    Alert.alert('Quizylo', profile?.full_name || 'Mon compte', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: () => signOut() },
    ]);
  };

  return (
    <Screen>
      <TopBar
        xp={profile?.xp ?? 0}
        streak={profile?.streak_days ?? 0}
        onMenu={onMenu}
        onPro={() => comingSoon('Quizylo PRO')}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Mascot size={76} />
          <Text variant="title" center style={styles.heroTitle}>
            Entraîne-toi avec de vrais examens blancs.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.heroBtn, pressed && styles.pressed]}
            onPress={() => comingSoon('Créer un examen blanc')}>
            <Text variant="bodyStrong" color={Palette.onPrimary}>
              Créer un examen blanc
            </Text>
          </Pressable>
        </View>

        <Text variant="small" color={Palette.textSecondary} style={styles.sectionLabel}>
          Que veux-tu faire ?
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {ACTIONS.map((a) => (
            <Pressable
              key={a.key}
              style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
              onPress={() => comingSoon(a.label)}>
              <Ionicons name={a.icon} size={16} color={Palette.primary} />
              <Text variant="small">{a.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
      </ScrollView>

      <Pressable
        style={styles.chatBar}
        onPress={() => comingSoon('Chat IA')}
        accessibilityRole="button">
        <Ionicons name="add" size={22} color={Palette.textSecondary} />
        <Text variant="body" color={Palette.textMuted} style={styles.chatPlaceholder}>
          Demande à Quizylo…
        </Text>
        <Ionicons name="camera-outline" size={20} color={Palette.textSecondary} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: Spacing.xxl },
  hero: {
    alignItems: 'center',
    gap: Spacing.lg,
    paddingTop: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
  },
  heroTitle: { maxWidth: 280, marginTop: Spacing.sm },
  heroBtn: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionLabel: { marginTop: Spacing.xxl, marginBottom: Spacing.md, marginLeft: Spacing.lg },
  chips: { paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chatBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    height: 52,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.lg,
  },
  chatPlaceholder: { flex: 1 },
  pressed: { opacity: 0.85 },
});
