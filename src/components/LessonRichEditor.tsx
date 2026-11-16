// Éditeur de leçon riche, basé sur TenTap (TipTap/ProseMirror dans une WebView).
// Charge le document `content` ; si absent, le construit depuis les anciens blocs
// texte (migration sans perte, `blocks` n'est jamais détruit). Autosave débouncé.
// Expose `insertImage(src)` au parent pour insérer une image dans le flux du texte.

import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { LESSON_TEXT_COLORS, saveLessonContent, type LessonBlock } from '@/lib/courses';
import { blocksToDoc, isEmptyDoc, type TipTapDoc } from '@/lib/lessonContent';

export type LessonRichEditorHandle = {
  /** Insère une image (data URI ou URL) à la position du curseur. */
  insertImage: (src: string) => void;
};

type Props = {
  lessonId: string;
  /** Document déjà enregistré (ou null si la leçon n'a pas encore été migrée). */
  initialContent: Record<string, unknown> | null;
  /** Anciens blocs, source de la migration texte si `content` est vide. */
  initialBlocks: LessonBlock[];
  onSaving?: () => void;
  onSaved?: () => void;
};

export const LessonRichEditor = forwardRef<LessonRichEditorHandle, Props>(function LessonRichEditor(
  { lessonId, initialContent, initialBlocks, onSaving, onSaved },
  ref,
) {
  // Document de départ, calculé une seule fois.
  const { initialDoc, migrated } = useMemo(() => {
    const existing = initialContent as TipTapDoc | null;
    if (existing && !isEmptyDoc(existing)) {
      return { initialDoc: existing, migrated: false };
    }
    const textBlocks = initialBlocks.filter(
      (b) => b.type === 'heading' || b.type === 'subheading' || b.type === 'text',
    );
    return { initialDoc: blocksToDoc(textBlocks), migrated: true };
    // On fige volontairement le calcul au montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const save = useCallback(async () => {
    try {
      onSaving?.();
      const json = (await editorRef.current?.getJSON()) as Record<string, unknown> | undefined;
      if (json) await saveLessonContent(lessonId, json);
      onSaved?.();
    } catch {
      // On n'invente rien : en cas d'échec réseau, on réessaiera au prochain changement.
    }
  }, [lessonId, onSaving, onSaved]);

  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(save, 800);
  }, [save]);

  const editor = useEditorBridge({
    autofocus: false,
    avoidIosKeyboard: true,
    initialContent: initialDoc,
    onChange: () => scheduleSave(),
  });

  // Ref vers l'éditeur pour que `save` lise toujours l'instance courante.
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // Insertion d'image exposée au parent.
  useImperativeHandle(
    ref,
    () => ({
      insertImage: (src: string) => {
        editor.setImage(src);
        scheduleSave();
      },
    }),
    [editor, scheduleSave],
  );

  // Migration : si on a construit le document depuis les blocs, on l'enregistre une fois.
  useEffect(() => {
    if (migrated && !isEmptyDoc(initialDoc)) {
      onSaving?.();
      saveLessonContent(lessonId, initialDoc as unknown as Record<string, unknown>)
        .then(() => onSaved?.())
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde en attente lors du démontage.
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
        save();
      }
    };
  }, [save]);

  return (
    <View style={styles.root}>
      {/* Couleur du texte : sélectionne du texte puis choisis une couleur. */}
      <View style={styles.colorBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.colorRow}>
          <Pressable
            onPress={() => editor.unsetColor()}
            style={styles.colorDefault}
            accessibilityLabel="Couleur par défaut">
            <Text style={styles.colorDefaultText}>A</Text>
          </Pressable>
          {LESSON_TEXT_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => editor.setColor(c)}
              style={[styles.swatch, { backgroundColor: c }]}
              accessibilityLabel={`Couleur ${c}`}
            />
          ))}
        </ScrollView>
      </View>

      <RichText editor={editor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={styles.toolbar}>
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </View>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  colorBar: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  colorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  colorDefault: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  colorDefaultText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.25)',
  },
});
