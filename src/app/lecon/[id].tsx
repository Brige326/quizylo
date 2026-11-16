import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  getLesson,
  renameLesson,
  saveLessonBlocks,
  type LessonBlock,
  type LessonBlockType,
} from '@/lib/courses';

let _seq = 0;
const newId = () => `${Date.now().toString(36)}-${(_seq++).toString(36)}`;

type SaveState = 'idle' | 'saving' | 'saved';

export default function LeconScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; name?: string; color?: string }>();
  const lessonId = params.id;
  const color = params.color ?? Palette.primary;
  const userId = session?.user?.id;

  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState(params.name ?? '');
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [focusId, setFocusId] = useState<string | null>(null);

  // Refs pour l'autosave (évite les closures périmées).
  const blocksRef = useRef<LessonBlock[]>([]);
  const titleRef = useRef(title);
  const savedTitleRef = useRef(title);
  const dirtyRef = useRef(false);
  blocksRef.current = blocks;
  titleRef.current = title;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!lessonId) return;
      try {
        const l = await getLesson(lessonId);
        if (alive && l) {
          setTitle(l.title);
          savedTitleRef.current = l.title;
          setBlocks(l.blocks ?? []);
        }
      } catch {
        // On n'invente rien : en cas d'échec, l'écran reste éditable et réessaiera à la sauvegarde.
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [lessonId]);

  const persist = useCallback(async () => {
    if (!lessonId || !userId) return;
    try {
      setSaveState('saving');
      await saveLessonBlocks(lessonId, blocksRef.current);
      if (titleRef.current.trim() && titleRef.current !== savedTitleRef.current) {
        await renameLesson(lessonId, titleRef.current);
        savedTitleRef.current = titleRef.current;
      }
      dirtyRef.current = false;
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }, [lessonId, userId]);

  // Autosave débouncé à chaque modification.
  useEffect(() => {
    if (loading) return;
    dirtyRef.current = true;
    setSaveState('idle');
    const t = setTimeout(persist, 700);
    return () => clearTimeout(t);
  }, [blocks, title, loading, persist]);

  // Sauvegarde finale à la sortie de l'écran.
  useEffect(() => {
    return () => {
      if (dirtyRef.current) persist();
    };
  }, [persist]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/cours');
  };

  const addBlock = (type: LessonBlockType) => {
    const b: LessonBlock = { id: newId(), type, text: '' };
    setBlocks((prev) => {
      // Insère après le bloc actuellement actif, sinon à la fin.
      const idx = prev.findIndex((x) => x.id === focusId);
      if (idx === -1) return [...prev, b];
      const copy = prev.slice();
      copy.splice(idx + 1, 0, b);
      return copy;
    });
    setFocusId(b.id);
  };

  const updateBlock = (id: string, text: string) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));

  const changeType = (id: string, type: LessonBlockType) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type } : b)));

  const move = (id: string, dir: -1 | 1) =>
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const copy = prev.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const removeBlock = (id: string) => setBlocks((prev) => prev.filter((b) => b.id !== id));

  const blockMenu = (b: LessonBlock) => {
    Alert.alert('Bloc', undefined, [
      {
        text: b.type === 'heading' ? '• Titre' : 'Titre',
        onPress: () => changeType(b.id, 'heading'),
      },
      {
        text: b.type === 'subheading' ? '• Sous-titre' : 'Sous-titre',
        onPress: () => changeType(b.id, 'subheading'),
      },
      { text: b.type === 'text' ? '• Texte' : 'Texte', onPress: () => changeType(b.id, 'text') },
      { text: 'Monter', onPress: () => move(b.id, -1) },
      { text: 'Descendre', onPress: () => move(b.id, 1) },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeBlock(b.id) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const inputStyleFor = (type: LessonBlockType) => {
    if (type === 'heading') return styles.bHeading;
    if (type === 'subheading') return styles.bSubheading;
    return styles.bText;
  };
  const placeholderFor = (type: LessonBlockType) =>
    type === 'heading' ? 'Titre' : type === 'subheading' ? 'Sous-titre' : 'Commence à écrire…';

  return (
    <Screen>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <View style={styles.saveBadge}>
          {saveState === 'saving' ? (
            <>
              <ActivityIndicator size="small" color={Palette.textMuted} />
              <Text variant="small" color={Palette.textMuted}>
                Enregistrement…
              </Text>
            </>
          ) : saveState === 'saved' ? (
            <>
              <Ionicons name="checkmark-circle" size={16} color={color} />
              <Text variant="small" color={Palette.textMuted}>
                Enregistré
              </Text>
            </>
          ) : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={insets.top + 44}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
            {/* Titre de la leçon */}
            <TextInput
              style={styles.title}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de la leçon"
              placeholderTextColor={Palette.textMuted}
              multiline
            />
            <View style={[styles.titleRule, { backgroundColor: color }]} />

            {blocks.length === 0 ? (
              <Text variant="body" color={Palette.textMuted} style={styles.hint}>
                Ajoute un titre, un sous-titre ou du texte avec la barre en bas. Appuie longuement
                sur un bloc pour le déplacer, le transformer ou le supprimer.
              </Text>
            ) : (
              blocks.map((b) => (
                <Tappable
                  key={b.id}
                  onLongPress={() => blockMenu(b)}
                  delayLongPress={250}
                  haptic={false}
                  scaleTo={1}>
                  <TextInput
                    style={[styles.block, inputStyleFor(b.type)]}
                    value={b.text}
                    onChangeText={(t) => updateBlock(b.id, t)}
                    onFocus={() => setFocusId(b.id)}
                    placeholder={placeholderFor(b.type)}
                    placeholderTextColor={Palette.textMuted}
                    autoFocus={focusId === b.id}
                    multiline
                  />
                </Tappable>
              ))
            )}
            <View style={{ height: 24 }} />
          </ScrollView>

          {/* Barre d'insertion */}
          <View style={[styles.toolbar, { paddingBottom: insets.bottom + Spacing.sm }]}>
            <Tappable style={styles.tool} onPress={() => addBlock('heading')} scaleTo={0.92}>
              <Ionicons name="text" size={18} color={Palette.text} />
              <Text variant="small" color={Palette.textSecondary}>
                Titre
              </Text>
            </Tappable>
            <Tappable style={styles.tool} onPress={() => addBlock('subheading')} scaleTo={0.92}>
              <Ionicons name="text-outline" size={18} color={Palette.text} />
              <Text variant="small" color={Palette.textSecondary}>
                Sous-titre
              </Text>
            </Tappable>
            <Tappable style={styles.tool} onPress={() => addBlock('text')} scaleTo={0.92}>
              <Ionicons name="reorder-four-outline" size={18} color={Palette.text} />
              <Text variant="small" color={Palette.textSecondary}>
                Texte
              </Text>
            </Tappable>
          </View>
        </KeyboardAvoidingView>
      )}
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
  saveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  title: { color: Palette.text, ...Type.display, padding: 0 },
  titleRule: { width: 44, height: 4, borderRadius: 2, marginTop: Spacing.sm, marginBottom: Spacing.md },
  hint: { lineHeight: 22, marginTop: Spacing.sm },
  block: {
    color: Palette.text,
    paddingVertical: Spacing.xs,
    paddingHorizontal: 0,
  },
  bHeading: { ...Type.title },
  bSubheading: { ...Type.heading },
  bText: { ...Type.body, lineHeight: 23 },
  toolbar: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
    backgroundColor: Palette.background,
  },
  tool: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
  },
});
