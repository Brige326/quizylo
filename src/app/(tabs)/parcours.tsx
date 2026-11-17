import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { TopBar } from '@/components/TopBar';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { listUserGeneratedContent, type GenItem } from '@/lib/courses';

const KIND_META: Record<string, { label: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  quiz: { label: 'Quiz', icon: 'help-circle', color: '#5B8CFF' },
  examen: { label: 'Examen blanc', icon: 'school', color: '#FF5A5F' },
  fiche: { label: 'Fiche', icon: 'document-text', color: '#22E07B' },
  flashcards: { label: 'Cartes mémoire', icon: 'albums', color: '#F5B301' },
  resume: { label: 'Résumé', icon: 'reader', color: '#A855F7' },
};
const DIFF_LABEL: Record<string, string> = { facile: 'Facile', moyen: 'Moyen', difficile: 'Difficile' };
const LEVEL_LABEL: Record<string, string> = { college: 'Collège', lycee: 'Lycée', superieur: 'Supérieur' };

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '';
  }
}

export default function ParcoursScreen() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const userId = session?.user?.id;

  const [items, setItems] = useState<GenItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setItems(await listUserGeneratedContent(userId));
    } catch {
      // rien d'inventé
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const meta = (kind: string) => KIND_META[kind] ?? { label: kind, icon: 'sparkles' as const, color: Palette.primary };

  const subtitle = (it: GenItem) => {
    const parts = [meta(it.kind).label];
    if (it.difficulty && DIFF_LABEL[it.difficulty]) parts.push(DIFF_LABEL[it.difficulty]);
    if (it.level && LEVEL_LABEL[it.level]) parts.push(LEVEL_LABEL[it.level]);
    parts.push(fmtDate(it.created_at));
    return parts.filter(Boolean).join(' · ');
  };

  return (
    <Screen>
      <TopBar xp={profile?.xp ?? 0} streak={profile?.streak_days ?? 0} showMenu={false} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
        </View>
      ) : items.length === 0 ? (
        <EmptyState
          icon="trail-sign-outline"
          eyebrow="Tes parcours"
          title="Transforme tes fichiers en savoir"
          subtitle="Choisis une matière, ajoute tes cours et documents, et génère un quiz, un résumé ou une fiche de révision adaptés.">
          <Button label="Créer un parcours" onPress={() => router.push('/parcours/nouveau')} />
        </EmptyState>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <View style={styles.headerRow}>
              <Text variant="heading">Tes parcours</Text>
              <Pressable
                onPress={() => router.push('/parcours/nouveau')}
                style={({ pressed }) => [styles.newBtn, pressed && styles.pressed]}
                accessibilityLabel="Créer un parcours">
                <Ionicons name="add" size={18} color={Palette.onPrimary} />
                <Text variant="bodyStrong" color={Palette.onPrimary}>
                  Créer
                </Text>
              </Pressable>
            </View>
          }
          renderItem={({ item }) => {
            const m = meta(item.kind);
            return (
              <Pressable
                onPress={() => router.push(`/revision/${item.id}`)}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                accessibilityLabel={item.title}>
                <View style={[styles.rowIcon, { backgroundColor: m.color + '22' }]}>
                  <Ionicons name={m.icon} size={20} color={m.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" color={Palette.text} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="caption" color={Palette.textMuted}>
                    {subtitle(item)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
              </Pressable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Palette.primary,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
});
