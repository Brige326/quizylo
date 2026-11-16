// Éditeur de leçon riche, basé sur TenTap (TipTap/ProseMirror dans une WebView).
// Charge le document `content` ; si absent, le construit depuis les anciens blocs
// texte (migration sans perte, `blocks` n'est jamais détruit). Autosave débouncé.
// Expose `insertImage(src)` au parent pour insérer une image dans le flux du texte.

import { Ionicons } from '@expo/vector-icons';
import { RichText, Toolbar, useEditorBridge } from '@10play/tentap-editor';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { customEditorHtml } from '@/editor-web/editorHtml';
import { LESSON_TEXT_COLORS, saveLessonContent, type LessonBlock } from '@/lib/courses';
import { blocksToDoc, isEmptyDoc, type TipTapDoc } from '@/lib/lessonContent';

// Éditeur web sur-mesure (avec tableaux). Mettre à false pour revenir au moteur
// TenTap par défaut (sans tableaux) en cas de souci sur appareil.
const CUSTOM_BUNDLE = true;

export type TableAction =
  | 'addRowAfter'
  | 'addColumnAfter'
  | 'deleteRow'
  | 'deleteColumn'
  | 'deleteTable';

export type LessonRichEditorHandle = {
  /** Insère une image (data URI ou URL) à la position du curseur. */
  insertImage: (src: string) => void;
  /** Insère un tableau 3×3 avec ligne d'en-tête. */
  insertTable: () => void;
  /** Modifie le tableau contenant le curseur (ligne/colonne/suppression). */
  tableAction: (action: TableAction) => void;
  /** Insère une formule mathématique (LaTeX) rendue par KaTeX. */
  insertMath: (latex: string, block?: boolean) => void;
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

  // Une leçon vide ouvre directement le clavier pour écrire tout de suite.
  const startEmpty = useMemo(() => isEmptyDoc(initialDoc), [initialDoc]);

  const editor = useEditorBridge({
    autofocus: startEmpty,
    avoidIosKeyboard: true,
    initialContent: initialDoc,
    customSource: CUSTOM_BUNDLE ? customEditorHtml : undefined,
    onChange: () => scheduleSave(),
  });

  // Ref vers l'éditeur pour que `save` lise toujours l'instance courante.
  const editorRef = useRef(editor);
  editorRef.current = editor;

  // Texte d'invite pour guider une leçon vide.
  useEffect(() => {
    editor.setPlaceholder('Commence à écrire ta leçon…');
  }, [editor]);

  // Mode du bandeau de couleurs : couleur du texte ou surligneur.
  const [colorMode, setColorMode] = useState<'text' | 'highlight'>('text');
  const applyColor = (c: string) =>
    colorMode === 'text' ? editor.setColor(c) : editor.setHighlight(c);
  const clearColor = () =>
    colorMode === 'text' ? editor.unsetColor() : editor.unsetHighlight();

  // Insertion d'image exposée au parent.
  useImperativeHandle(
    ref,
    () => ({
      insertImage: (src: string) => {
        editor.setImage(src);
        scheduleSave();
      },
      insertTable: () => {
        // L'extension Table vit dans le bundle web : on pilote via injectJS.
        editor.injectJS(
          "window.__quizyloEditor && window.__quizyloEditor.chain().focus().insertTable({rows:3,cols:3,withHeaderRow:true}).run();",
        );
        scheduleSave();
      },
      tableAction: (action: TableAction) => {
        editor.injectJS(
          `window.__quizyloEditor && window.__quizyloEditor.chain().focus().${action}().run();`,
        );
        scheduleSave();
      },
      insertMath: (latex: string, block?: boolean) => {
        const cmd = block ? 'insertBlockMath' : 'insertInlineMath';
        editor.injectJS(
          `window.__quizyloEditor && window.__quizyloEditor.chain().focus().${cmd}({latex: ${JSON.stringify(
            latex,
          )}}).run();`,
        );
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
      {/* Sélectionne du texte, choisis le mode (couleur / surligneur), puis une couleur. */}
      <View style={styles.colorBar}>
        <Pressable
          onPress={() => setColorMode((m) => (m === 'text' ? 'highlight' : 'text'))}
          style={styles.modeToggle}
          accessibilityLabel={colorMode === 'text' ? 'Mode couleur du texte' : 'Mode surligneur'}>
          <Ionicons
            name={colorMode === 'text' ? 'text' : 'brush'}
            size={16}
            color="#FFFFFF"
          />
          <Text style={styles.modeLabel}>{colorMode === 'text' ? 'Texte' : 'Surligne'}</Text>
        </Pressable>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.colorRow}>
          <Pressable
            onPress={clearColor}
            style={styles.colorDefault}
            accessibilityLabel="Retirer la couleur">
            <Ionicons name="ban" size={15} color="#FFFFFF" />
          </Pressable>
          {LESSON_TEXT_COLORS.map((c) => (
            <Pressable
              key={c}
              onPress={() => applyColor(c)}
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
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  modeToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 8,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(255,255,255,0.12)',
  },
  modeLabel: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
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
