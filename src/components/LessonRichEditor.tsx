// Éditeur de leçon riche, basé sur TenTap (TipTap/ProseMirror dans une WebView).
// Charge le document `content` ; si absent, le construit depuis les anciens blocs
// texte (migration sans perte, `blocks` n'est jamais détruit). Autosave débouncé.

import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';

import { saveLessonContent, type LessonBlock } from '@/lib/courses';
import { blocksToDoc, isEmptyDoc, type TipTapDoc } from '@/lib/lessonContent';

type Props = {
  lessonId: string;
  /** Document déjà enregistré (ou null si la leçon n'a pas encore été migrée). */
  initialContent: Record<string, unknown> | null;
  /** Anciens blocs, source de la migration texte si `content` est vide. */
  initialBlocks: LessonBlock[];
  onSaving?: () => void;
  onSaved?: () => void;
};

export function LessonRichEditor({
  lessonId,
  initialContent,
  initialBlocks,
  onSaving,
  onSaved,
}: Props) {
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
      <RichText editor={editor} />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
        style={styles.toolbar}>
        <Toolbar editor={editor} />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  toolbar: { position: 'absolute', left: 0, right: 0, bottom: 0 },
});
