import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import { searchCourses, type CourseSearchResult } from '@/lib/courses';

const TYPE_META: Record<
  CourseSearchResult['type'],
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  subject: { label: 'Matière', icon: 'library' },
  chapter: { label: 'Chapitre', icon: 'list' },
  document: { label: 'Document', icon: 'document-text' },
  generated: { label: 'Révision', icon: 'sparkles' },
};

export default function RechercheCoursScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CourseSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  // Recherche avec léger anti-rebond : on attend que l'utilisateur arrête de taper.
  useEffect(() => {
    const q = query.trim();
    if (!q || !userId) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    let active = true;
    const t = setTimeout(async () => {
      try {
        const r = await searchCourses(userId, q);
        if (active) setResults(r);
      } catch {
        if (active) setResults([]);
      } finally {
        if (active) setSearching(false);
      }
    }, 220);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [query, userId]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/cours');
  };

  const open = (r: CourseSearchResult) => {
    if (r.type === 'subject') {
      router.push({ pathname: '/matiere/[id]', params: { id: r.id, name: r.title, color: r.color } });
    } else if (r.type === 'chapter') {
      router.push({
        pathname: '/chapitre/[id]',
        params: { id: r.id, subjectId: r.subjectId, name: r.title, color: r.color },
      });
    } else if (r.type === 'document') {
      if (r.chapterId) {
        router.push({
          pathname: '/chapitre/[id]',
          params: { id: r.chapterId, subjectId: r.subjectId, name: r.chapterName, color: r.color },
        });
      } else {
        router.push({ pathname: '/matiere/[id]', params: { id: r.subjectId, name: '', color: r.color } });
      }
    } else {
      router.push({ pathname: '/revision/[id]', params: { id: r.id } });
    }
  };

  const trimmed = query.trim();
  const showEmpty = useMemo(
    () => trimmed.length > 0 && !searching && results.length === 0,
    [trimmed, searching, results.length],
  );

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <View style={styles.field}>
          <Ionicons name="search" size={18} color={Palette.textMuted} />
          <TextInput
            style={styles.input}
            placeholder="Matière, chapitre, document, quiz…"
            placeholderTextColor={Palette.textMuted}
            value={query}
            onChangeText={setQuery}
            autoFocus
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query ? (
            <Tappable onPress={() => setQuery('')} scaleTo={0.9} accessibilityLabel="Effacer">
              <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
            </Tappable>
          ) : null}
        </View>
      </View>

      {trimmed.length === 0 ? (
        <View style={styles.center}>
          <Ionicons name="search" size={40} color={Palette.textMuted} />
          <Text variant="body" color={Palette.textMuted} center style={{ marginTop: Spacing.md }}>
            Retrouve n'importe quel contenu de tes cours.
          </Text>
        </View>
      ) : showEmpty ? (
        <View style={styles.center}>
          <Text variant="body" color={Palette.textMuted}>
            Aucun résultat pour « {trimmed} ».
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(r) => `${r.type}-${r.id}`}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            searching ? <ActivityIndicator color={Palette.primary} style={{ marginBottom: Spacing.md }} /> : undefined
          }
          renderItem={({ item }) => {
            const meta = TYPE_META[item.type];
            const tint = item.type === 'generated' ? Palette.primary : item.color;
            return (
              <Tappable style={styles.row} onPress={() => open(item)} haptic={false}>
                <View style={[styles.icon, { backgroundColor: tint + '22' }]}>
                  <Ionicons name={meta.icon} size={20} color={tint} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.title || 'Sans titre'}
                  </Text>
                  <Text variant="small" color={Palette.textMuted}>
                    {meta.label}
                    {item.type === 'document' && item.chapterName ? ` · ${item.chapterName}` : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
              </Tappable>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    height: 46,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
  },
  input: { flex: 1, color: Palette.text, ...Type.body },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  list: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
