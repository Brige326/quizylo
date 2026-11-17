import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { SUBJECT_GROUPS } from '@/lib/subjects';
import { comingSoon } from '@/lib/ui';

const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function SujetsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const q = norm(query.trim());
  const groups = useMemo(
    () =>
      SUBJECT_GROUPS.map((g) => ({
        ...g,
        items: q ? g.items.filter((it) => norm(it.label).includes(q)) : g.items,
      })).filter((g) => g.items.length > 0),
    [q],
  );

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const count = selected.size;

  const validate = () => {
    if (count === 0) return;
    // La sélection sera mémorisée et renverra au chat en S3.
    router.back();
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.xs }]}>
      {/* En-tête */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityLabel="Fermer">
          <Ionicons name="close" size={26} color={Palette.text} />
        </Pressable>
        <Text variant="bodyStrong" style={{ flex: 1, textAlign: 'center' }}>
          Voir tous les sujets
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {/* Recherche */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={16} color={Palette.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Rechercher une matière…"
          placeholderTextColor={Palette.textMuted}
          returnKeyType="search"
        />
        {query ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={Palette.textMuted} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {groups.map((g) => (
          <View key={g.title} style={styles.group}>
            <Text variant="bodyStrong" style={styles.groupTitle}>
              {g.title}
            </Text>
            <View style={styles.chips}>
              {g.items.map((it) => {
                const on = selected.has(it.key);
                return (
                  <Pressable
                    key={it.key}
                    onPress={() => toggle(it.key)}
                    style={[styles.chip, on && { backgroundColor: g.color, borderColor: g.color }]}
                    accessibilityLabel={it.label}>
                    <Ionicons
                      name={on ? 'checkmark' : it.icon}
                      size={15}
                      color={on ? '#fff' : g.color}
                    />
                    <Text variant="small" color={on ? '#fff' : Palette.text}>
                      {it.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        {groups.length === 0 ? (
          <Text variant="body" color={Palette.textMuted} style={{ textAlign: 'center', marginTop: Spacing.xl }}>
            Aucune matière trouvée.
          </Text>
        ) : (
          <Pressable style={styles.propose} onPress={() => comingSoon('Proposer un sujet')}>
            <Ionicons name="add-circle-outline" size={18} color={Palette.primary} />
            <Text variant="small" color={Palette.primary}>
              Propose un sujet
            </Text>
          </Pressable>
        )}
        <View style={{ height: 24 }} />
      </ScrollView>

      {/* Bas : valider */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
        <Pressable
          onPress={validate}
          disabled={count === 0}
          style={[styles.cta, count === 0 && styles.ctaDisabled]}>
          <Text variant="bodyStrong" color={count === 0 ? Palette.textMuted : Palette.onPrimary}>
            {count === 0 ? 'Choisis-en au moins 1' : `Continuer (${count})`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 42,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
  },
  searchInput: { flex: 1, color: Palette.text, fontSize: 15, paddingVertical: 0 },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  group: { marginBottom: Spacing.lg },
  groupTitle: { marginBottom: Spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
    borderWidth: 1,
    borderColor: Palette.border,
  },
  propose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
  },
  cta: {
    height: 52,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.primary,
  },
  ctaDisabled: { backgroundColor: Palette.surface },
});
