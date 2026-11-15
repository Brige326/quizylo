import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { Mascot } from '@/components/ui/Mascot';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Screen } from '@/components/ui/Screen';
import { TopBar } from '@/components/TopBar';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { comingSoon } from '@/lib/ui';

type Action = { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string };

const ACTIONS: Action[] = [
  { key: 'resoudre', label: 'Résoudre', icon: 'camera', color: Palette.info },
  { key: 'quiz', label: 'Quiz', icon: 'help-circle', color: '#FF4D8D' },
  { key: 'examen', label: 'Examen blanc', icon: 'document-text', color: '#5B8CFF' },
  { key: 'resume', label: 'Résumer', icon: 'reader', color: Palette.primary },
  { key: 'redaction', label: 'Rédaction', icon: 'create', color: Palette.purple },
  { key: 'rechercher', label: 'Rechercher', icon: 'search', color: '#2DD4BF' },
  { key: 'aide', label: 'Aide-mémoire', icon: 'albums', color: Palette.streak },
  { key: 'vocab', label: 'Vocabulaire', icon: 'language', color: '#F5B301' },
  { key: 'image', label: 'Créer une image', icon: 'image', color: '#A855F7' },
];

export default function AccueilScreen() {
  const { profile } = useAuth();
  const router = useRouter();
  const [draft, setDraft] = useState('');

  const openChat = (initial?: string) => {
    const q = (initial ?? draft).trim();
    setDraft('');
    router.push(q ? { pathname: '/chat', params: { q } } : '/chat');
  };

  return (
    <Screen>
      <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Accueil = discussion IA : zone de bienvenue centrée */}
        <View style={styles.welcome}>
          <Mascot size={80} />
          <View style={styles.heroCard}>
            <Text variant="title" center style={styles.heroTitle}>
              Entraîne-toi avec de vrais examens blancs.
            </Text>
          </View>
          <Tappable style={styles.cta} onPress={() => comingSoon('Créer un examen blanc')}>
            <Text variant="bodyStrong" color={Palette.background}>
              Créer un examen blanc
            </Text>
          </Tappable>
        </View>

        {/* Onglets d'actions — juste au-dessus de la barre d'écriture */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}>
          {ACTIONS.map((a) => (
            <Tappable key={a.key} style={styles.chip} onPress={() => comingSoon(a.label)}>
              <Ionicons name={a.icon} size={16} color={a.color} />
              <Text variant="small">{a.label}</Text>
            </Tappable>
          ))}
        </ScrollView>

        {/* Barre d'écriture — visible et prominente */}
        <View style={styles.inputRow}>
          <Tappable
            style={styles.plus}
            onPress={() => comingSoon('Pièce jointe')}
            scaleTo={0.9}
            accessibilityLabel="Ajouter">
            <Ionicons name="add" size={24} color={Palette.text} />
          </Tappable>
          <View style={styles.inputField}>
            <TextInput
              style={styles.input}
              placeholder="Demande à Quizylo…"
              placeholderTextColor={Palette.textMuted}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={() => openChat()}
              returnKeyType="send"
            />
            {draft.trim() ? (
              <Tappable onPress={() => openChat()} scaleTo={0.9} accessibilityLabel="Envoyer">
                <View style={styles.sendBtn}>
                  <Ionicons name="arrow-up" size={18} color={Palette.background} />
                </View>
              </Tappable>
            ) : (
              <Tappable onPress={() => comingSoon('Appareil photo')} scaleTo={0.9}>
                <Ionicons name="camera-outline" size={22} color={Palette.textSecondary} />
              </Tappable>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Spacing.lg, gap: Spacing.lg },
  heroCard: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    marginTop: -Spacing.md,
    alignSelf: 'stretch',
  },
  heroTitle: { fontSize: 24, lineHeight: 30 },
  cta: {
    backgroundColor: '#F4F4F5',
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  chips: { paddingHorizontal: Spacing.lg, gap: Spacing.sm, paddingBottom: Spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  plus: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: Palette.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputField: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    height: 50,
    paddingHorizontal: Spacing.lg,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
    borderRadius: Radius.pill,
  },
  input: { flex: 1, color: Palette.text, ...Type.body },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
