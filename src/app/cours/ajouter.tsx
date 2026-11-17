import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { createSubject, listSubjects, SUBJECT_COLORS, type Subject } from '@/lib/courses';
import { SUBJECT_GROUPS } from '@/lib/subjects';

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

export default function AjouterMatiereScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [existing, setExisting] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Record<string, string>>({}); // label -> couleur
  const [customs, setCustoms] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      setExisting(await listSubjects(userId));
    } catch {
      // rien d'inventé
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const existingNames = useMemo(() => new Set(existing.map((s) => norm(s.name))), [existing]);

  const q = norm(query);
  const catalogGroups = useMemo(
    () =>
      SUBJECT_GROUPS.map((g) => ({
        ...g,
        items: q ? g.items.filter((it) => norm(it.label).includes(q)) : g.items,
      })).filter((g) => g.items.length > 0),
    [q],
  );

  const toggle = (label: string, color: string) => {
    if (existingNames.has(norm(label))) return;
    setSelected((cur) => {
      const next = { ...cur };
      if (next[label]) delete next[label];
      else next[label] = color;
      return next;
    });
  };

  const addCustom = () => {
    const t = customInput.trim();
    if (!t) return;
    const nt = norm(t);
    if (existingNames.has(nt) || customs.some((c) => norm(c) === nt) || Object.keys(selected).some((l) => norm(l) === nt)) {
      setCustomInput('');
      return;
    }
    setCustoms((c) => [...c, t]);
    setCustomInput('');
  };
  const removeCustom = (name: string) => setCustoms((c) => c.filter((x) => x !== name));

  const total = Object.keys(selected).length + customs.length;

  const save = async () => {
    if (!userId || total === 0 || saving) return;
    setSaving(true);
    try {
      let pos = existing.length;
      for (const [label, color] of Object.entries(selected)) {
        await createSubject(userId, label, color, pos++);
      }
      for (const name of customs) {
        await createSubject(userId, name, SUBJECT_COLORS[pos % SUBJECT_COLORS.length], pos++);
      }
      router.back();
    } catch {
      Alert.alert('Oups', "Certaines matières n'ont pas pu être ajoutées. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.xs }]}>
      <View style={styles.header}>
        <Text variant="title">Ajouter des matières</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeBtn} accessibilityLabel="Fermer">
          <Ionicons name="close" size={22} color={Palette.text} />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: 120 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          {/* Matière personnalisée */}
          <Text variant="bodyStrong" color={Palette.textSecondary} style={styles.sectionTitle}>
            Matière personnalisée
          </Text>
          <View style={styles.customRow}>
            <TextInput
              value={customInput}
              onChangeText={setCustomInput}
              placeholder="Ex. Comptabilité, Anatomie…"
              placeholderTextColor={Palette.textMuted}
              style={styles.customInput}
              onSubmitEditing={addCustom}
              returnKeyType="done"
            />
            <Pressable
              onPress={addCustom}
              style={({ pressed }) => [styles.addCustomBtn, pressed && styles.pressed]}
              accessibilityLabel="Ajouter la matière personnalisée">
              <Ionicons name="add" size={20} color={Palette.onPrimary} />
            </Pressable>
          </View>
          {customs.length > 0 ? (
            <View style={styles.wrap}>
              {customs.map((c) => (
                <Pressable key={c} onPress={() => removeCustom(c)} style={[styles.chip, styles.chipOn]} accessibilityLabel={`Retirer ${c}`}>
                  <Text variant="caption" color={Palette.onPrimary}>
                    {c}
                  </Text>
                  <Ionicons name="close" size={14} color={Palette.onPrimary} />
                </Pressable>
              ))}
            </View>
          ) : null}

          {/* Recherche catalogue */}
          <View style={styles.search}>
            <Ionicons name="search" size={18} color={Palette.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Rechercher une matière…"
              placeholderTextColor={Palette.textMuted}
              style={styles.searchInput}
              autoCorrect={false}
            />
            {query ? (
              <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityLabel="Effacer">
                <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
              </Pressable>
            ) : null}
          </View>

          {/* Catalogue */}
          {catalogGroups.length === 0 ? (
            <Text variant="caption" color={Palette.textMuted}>
              Aucune matière ne correspond à ta recherche.
            </Text>
          ) : (
            catalogGroups.map((g) => (
              <View key={g.title} style={{ marginBottom: Spacing.md }}>
                <Text variant="caption" color={g.color} style={styles.groupTitle}>
                  {g.title}
                </Text>
                <View style={styles.wrap}>
                  {g.items.map((it) => {
                    const already = existingNames.has(norm(it.label));
                    const on = !!selected[it.label];
                    return (
                      <Pressable
                        key={it.key}
                        onPress={() => toggle(it.label, g.color)}
                        disabled={already}
                        style={[styles.chip, on && styles.chipOn, already && styles.chipDone]}
                        accessibilityLabel={it.label}>
                        <Ionicons
                          name={already ? 'checkmark' : it.icon}
                          size={15}
                          color={on ? Palette.onPrimary : already ? Palette.textMuted : g.color}
                        />
                        <Text variant="caption" color={on ? Palette.onPrimary : already ? Palette.textMuted : Palette.text}>
                          {it.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <Pressable
          onPress={save}
          disabled={total === 0 || saving}
          style={({ pressed }) => [styles.cta, (total === 0 || saving) && styles.ctaOff, pressed && styles.pressed]}>
          <Text variant="bodyStrong" color={total === 0 || saving ? Palette.textMuted : Palette.onPrimary}>
            {saving ? 'Ajout…' : total === 0 ? 'Choisis au moins 1 matière' : `Ajouter (${total})`}
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: Spacing.lg },
  sectionTitle: { marginTop: Spacing.sm, marginBottom: Spacing.sm },
  customRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
  customInput: {
    flex: 1,
    color: Palette.text,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  addCustomBtn: {
    width: 46,
    height: 46,
    borderRadius: Radius.md,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchInput: { flex: 1, color: Palette.text, paddingVertical: 2 },
  groupTitle: { textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Palette.surface,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipOn: { backgroundColor: Palette.primary },
  chipDone: { opacity: 0.5 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    backgroundColor: Palette.background,
    borderTopWidth: 1,
    borderTopColor: Palette.border,
  },
  cta: {
    backgroundColor: Palette.primary,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaOff: { backgroundColor: Palette.surface },
  pressed: { opacity: 0.6 },
});
