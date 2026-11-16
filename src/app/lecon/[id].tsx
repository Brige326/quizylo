import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { LessonRichEditor } from '@/components/LessonRichEditor';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  getLesson,
  isMediaBlock,
  LESSON_FONTS,
  LESSON_TEXT_COLORS,
  removeLessonAsset,
  renameLesson,
  saveLessonBlocks,
  signedUrlFor,
  uploadLessonAsset,
  type LessonBlock,
  type LessonBlockType,
  type LessonFont,
} from '@/lib/courses';

/** Résout la famille de police réelle selon la police choisie et le type de bloc. */
function fontFamilyFor(font: LessonFont | undefined, type: LessonBlockType): string | undefined {
  const bold = type === 'heading' || type === 'subheading';
  if (font === 'serif') return bold ? 'Lora_700Bold' : 'Lora_400Regular';
  if (font === 'hand') return bold ? 'Caveat_700Bold' : 'Caveat_400Regular';
  return undefined;
}
const FONT_SAMPLE: Record<LessonFont, string | undefined> = {
  default: undefined,
  serif: 'Lora_400Regular',
  hand: 'Caveat_400Regular',
};

let _seq = 0;
const newId = () => `${Date.now().toString(36)}-${(_seq++).toString(36)}`;

type SaveState = 'idle' | 'saving' | 'saved';

// Phase 2 : nouvel éditeur riche (TenTap/TipTap). Mis à false pour revenir
// instantanément à l'ancien éditeur par blocs (les données `blocks` sont préservées).
const RICH_EDITOR = true;

export default function LeconScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; name?: string; color?: string }>();
  const lessonId = params.id;
  const color = params.color ?? Palette.primary;
  const userId = session?.user?.id;

  // L'éditeur s'affiche immédiatement (titre issu des paramètres) ; le contenu se
  // remplit ensuite. On ne bloque jamais tout l'écran sur le chargement.
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState(params.name ?? '');
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [content, setContent] = useState<Record<string, unknown> | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [colorPicker, setColorPicker] = useState<LessonBlock | null>(null);
  const [fontPicker, setFontPicker] = useState<LessonBlock | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);
  const [tab, setTab] = useState<'notes' | 'resources'>('notes');
  const { width: screenW } = useWindowDimensions();

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
      if (!lessonId) {
        if (alive) setLoading(false);
        return;
      }
      try {
        const l = await getLesson(lessonId);
        if (alive && l) {
          setTitle(l.title);
          savedTitleRef.current = l.title;
          setBlocks(l.blocks ?? []);
          setContent(l.content ?? null);
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

  // Résout les URLs signées des médias affichés.
  useEffect(() => {
    const missing = blocks.filter((b) => isMediaBlock(b.type) && b.path && !urls[b.path]);
    if (missing.length === 0) return;
    let alive = true;
    (async () => {
      for (const b of missing) {
        try {
          const u = await signedUrlFor(b.path!);
          if (alive) setUrls((prev) => ({ ...prev, [b.path!]: u }));
        } catch {
          // silencieux : on réessaiera au prochain rendu
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [blocks, urls]);

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

  useEffect(() => {
    if (loading) return;
    dirtyRef.current = true;
    setSaveState('idle');
    const t = setTimeout(persist, 700);
    return () => clearTimeout(t);
  }, [blocks, title, loading, persist]);

  useEffect(() => {
    return () => {
      if (dirtyRef.current) persist();
    };
  }, [persist]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/cours');
  };

  const insertAfterFocus = (b: LessonBlock) =>
    setBlocks((prev) => {
      const idx = prev.findIndex((x) => x.id === focusId);
      if (idx === -1) return [...prev, b];
      const copy = prev.slice();
      copy.splice(idx + 1, 0, b);
      return copy;
    });

  const addTextBlock = (type: LessonBlockType) => {
    const b: LessonBlock = { id: newId(), type, text: '' };
    insertAfterFocus(b);
    setFocusId(b.id);
  };

  const insertMedia = async (
    kind: 'image' | 'pdf',
    asset: { uri: string; name?: string; mime?: string },
  ) => {
    if (!userId || !lessonId) return;
    setBusy(true);
    try {
      const { path } = await uploadLessonAsset({
        userId,
        lessonId,
        kind,
        uri: asset.uri,
        name: asset.name,
        mime: asset.mime,
      });
      insertAfterFocus({ id: newId(), type: kind, path, name: asset.name, mime: asset.mime });
    } catch {
      Alert.alert('Oups', "Le fichier n'a pas pu être ajouté. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Appareil photo', "Autorise l'accès à l'appareil photo pour prendre une photo.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (res.canceled) return;
    const a = res.assets[0];
    await insertMedia('image', { uri: a.uri, name: a.fileName ?? undefined, mime: a.mimeType ?? 'image/jpeg' });
  };

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', "Autorise l'accès à tes photos pour importer une image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 0.7 });
    if (res.canceled) return;
    const a = res.assets[0];
    await insertMedia('image', { uri: a.uri, name: a.fileName ?? undefined, mime: a.mimeType ?? 'image/jpeg' });
  };

  const pickPdf = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    const a = res.assets[0];
    await insertMedia('pdf', { uri: a.uri, name: a.name, mime: a.mimeType ?? 'application/pdf' });
  };

  const attachMenu = () => {
    Alert.alert('Ajouter à la leçon', undefined, [
      { text: 'Prendre une photo', onPress: takePhoto },
      { text: 'Importer une image', onPress: pickImage },
      { text: 'Importer un PDF', onPress: pickPdf },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const insertMenu = () => {
    Alert.alert('Insérer', undefined, [
      { text: 'Titre', onPress: () => addTextBlock('heading') },
      { text: 'Sous-titre', onPress: () => addTextBlock('subheading') },
      { text: 'Texte', onPress: () => addTextBlock('text') },
      { text: 'Prendre une photo', onPress: takePhoto },
      { text: 'Importer une image', onPress: pickImage },
      { text: 'Importer un PDF', onPress: pickPdf },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const updateBlock = (id: string, text: string) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)));

  const changeType = (id: string, type: LessonBlockType) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type } : b)));

  const changeColor = (id: string, color?: string) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, color } : b)));

  const changeFont = (id: string, font: LessonFont) =>
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, font } : b)));

  const move = (id: string, dir: -1 | 1) =>
    setBlocks((prev) => {
      const i = prev.findIndex((b) => b.id === id);
      const j = i + dir;
      if (i === -1 || j < 0 || j >= prev.length) return prev;
      const copy = prev.slice();
      [copy[i], copy[j]] = [copy[j], copy[i]];
      return copy;
    });

  const removeBlock = (b: LessonBlock) => {
    setBlocks((prev) => prev.filter((x) => x.id !== b.id));
    if (isMediaBlock(b.type) && b.path) removeLessonAsset(b.path).catch(() => {});
  };

  const blockMenu = (b: LessonBlock) => {
    if (isMediaBlock(b.type)) {
      Alert.alert('Bloc', undefined, [
        { text: 'Monter', onPress: () => move(b.id, -1) },
        { text: 'Descendre', onPress: () => move(b.id, 1) },
        { text: 'Supprimer', style: 'destructive', onPress: () => removeBlock(b) },
        { text: 'Annuler', style: 'cancel' },
      ]);
      return;
    }
    Alert.alert('Bloc', undefined, [
      { text: b.type === 'heading' ? '• Titre' : 'Titre', onPress: () => changeType(b.id, 'heading') },
      {
        text: b.type === 'subheading' ? '• Sous-titre' : 'Sous-titre',
        onPress: () => changeType(b.id, 'subheading'),
      },
      { text: b.type === 'text' ? '• Texte' : 'Texte', onPress: () => changeType(b.id, 'text') },
      { text: 'Couleur…', onPress: () => setColorPicker(b) },
      { text: 'Monter', onPress: () => move(b.id, -1) },
      { text: 'Descendre', onPress: () => move(b.id, 1) },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeBlock(b) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const openPdf = async (b: LessonBlock) => {
    if (!b.path) return;
    try {
      const u = urls[b.path] ?? (await signedUrlFor(b.path));
      // iOS affiche le PDF nativement dans une WebView ; Android ouvre en externe.
      if (Platform.OS === 'ios') setPdfViewer({ url: u, name: b.name ?? 'Document PDF' });
      else Linking.openURL(u);
    } catch {
      Alert.alert('Oups', "Impossible d'ouvrir le PDF.");
    }
  };

  const confirmRemove = (b: LessonBlock) =>
    Alert.alert('Supprimer le bloc', 'Ce bloc sera retiré de la leçon.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => removeBlock(b) },
    ]);

  const iconFor = (b: LessonBlock): any => {
    if (b.type === 'heading') return 'text';
    if (b.type === 'subheading') return 'text-outline';
    if (b.type === 'image') return 'image-outline';
    if (b.type === 'pdf') return 'document-text-outline';
    return 'reorder-four-outline';
  };
  const previewFor = (b: LessonBlock): string => {
    if (b.type === 'image') return 'Image';
    if (b.type === 'pdf') return b.name ?? 'Document PDF';
    const t = (b.text ?? '').trim();
    if (t) return t;
    return b.type === 'heading' ? 'Titre' : b.type === 'subheading' ? 'Sous-titre' : 'Texte';
  };

  const inputStyleFor = (type: LessonBlockType) =>
    type === 'heading' ? styles.bHeading : type === 'subheading' ? styles.bSubheading : styles.bText;
  const placeholderFor = (type: LessonBlockType) =>
    type === 'heading' ? 'Titre' : type === 'subheading' ? 'Sous-titre' : 'Commence à écrire…';

  const renderBlock = (b: LessonBlock) => {
    if (b.type === 'image') {
      const u = b.path ? urls[b.path] : undefined;
      return (
        <Pressable
          key={b.id}
          onPress={() => u && setViewer(u)}
          onLongPress={() => blockMenu(b)}
          delayLongPress={250}>
          <View style={styles.imageWrap}>
            {u ? (
              <Image source={{ uri: u }} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.mediaLoading}>
                <ActivityIndicator color={color} />
              </View>
            )}
          </View>
        </Pressable>
      );
    }
    if (b.type === 'pdf') {
      return (
        <Pressable
          key={b.id}
          onPress={() => openPdf(b)}
          onLongPress={() => blockMenu(b)}
          delayLongPress={250}>
          <View style={styles.pdfCard}>
            <View style={[styles.pdfIcon, { backgroundColor: color + '22' }]}>
              <Ionicons name="document-text" size={20} color={color} />
            </View>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
              {b.name ?? 'Document PDF'}
            </Text>
            <Ionicons name="open-outline" size={18} color={Palette.textMuted} />
          </View>
        </Pressable>
      );
    }
    return (
      <Pressable
        key={b.id}
        onLongPress={() => blockMenu(b)}
        delayLongPress={250}>
        <TextInput
          style={[
            styles.block,
            inputStyleFor(b.type),
            b.color ? { color: b.color } : null,
            b.font && b.font !== 'default'
              ? { fontFamily: fontFamilyFor(b.font, b.type) }
              : null,
          ]}
          value={b.text ?? ''}
          onChangeText={(t) => updateBlock(b.id, t)}
          onFocus={() => setFocusId(b.id)}
          placeholder={placeholderFor(b.type)}
          placeholderTextColor={Palette.textMuted}
          autoFocus={focusId === b.id}
          multiline
        />
      </Pressable>
    );
  };

  const focusedBlock = blocks.find((b) => b.id === focusId && !isMediaBlock(b.type)) ?? null;

  return (
    <Screen>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Pressable onPress={back} hitSlop={12} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Pressable>
        <View style={styles.headerRight}>
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
          {RICH_EDITOR && !loading ? (
            <Pressable onPress={attachMenu} hitSlop={10} accessibilityLabel="Ajouter un média">
              <Ionicons name="attach" size={24} color={Palette.text} />
            </Pressable>
          ) : null}
          {!RICH_EDITOR && !loading && tab === 'notes' && blocks.length > 1 ? (
            <Pressable
              onPress={() => setReordering((r) => !r)}
              hitSlop={10}
              accessibilityLabel="Réorganiser">
              <Text variant="bodyStrong" color={reordering ? color : Palette.textSecondary}>
                {reordering ? 'Terminé' : 'Réorganiser'}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {/* Bascule Notes / Ressources */}
      <View style={styles.tabs}>
          <Pressable
            style={[styles.tab, tab === 'notes' && { backgroundColor: Palette.primarySurface }]}
            onPress={() => setTab('notes')}>
            <Text variant="small" color={tab === 'notes' ? color : Palette.textSecondary}>
              Notes
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, tab === 'resources' && { backgroundColor: Palette.primarySurface }]}
            onPress={() => {
              setReordering(false);
              setTab('resources');
            }}>
            <Text variant="small" color={tab === 'resources' ? color : Palette.textSecondary}>
              Ressources
            </Text>
          </Pressable>
        </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color} />
        </View>
      ) : tab === 'resources' ? (
        (() => {
          const images = blocks.filter((b) => b.type === 'image');
          const pdfs = blocks.filter((b) => b.type === 'pdf');
          const thumb = (screenW - Spacing.lg * 2 - Spacing.sm * 2) / 3;
          return (
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.body}
              showsVerticalScrollIndicator={false}>
              <Text variant="heading" style={{ marginBottom: Spacing.sm }}>
                Images
              </Text>
              {images.length === 0 ? (
                <Text variant="small" color={Palette.textMuted}>
                  Aucune image pour l’instant.
                </Text>
              ) : (
                <View style={styles.grid}>
                  {images.map((b) => {
                    const u = b.path ? urls[b.path] : undefined;
                    return (
                      <Pressable
                        key={b.id}
                        onPress={() => u && setViewer(u)}
                        style={[styles.thumb, { width: thumb, height: thumb }]}>
                        {u ? (
                          <Image source={{ uri: u }} style={styles.thumbImg} resizeMode="cover" />
                        ) : (
                          <ActivityIndicator color={color} />
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <Text variant="heading" style={{ marginTop: Spacing.xl, marginBottom: Spacing.sm }}>
                PDF
              </Text>
              {pdfs.length === 0 ? (
                <Text variant="small" color={Palette.textMuted}>
                  Aucun PDF pour l’instant.
                </Text>
              ) : (
                pdfs.map((b) => (
                  <Pressable key={b.id} onPress={() => openPdf(b)} style={styles.pdfCard}>
                    <View style={[styles.pdfIcon, { backgroundColor: color + '22' }]}>
                      <Ionicons name="document-text" size={20} color={color} />
                    </View>
                    <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                      {b.name ?? 'Document PDF'}
                    </Text>
                    <Ionicons name="open-outline" size={18} color={Palette.textMuted} />
                  </Pressable>
                ))
              )}
              <View style={{ height: 24 }} />
            </ScrollView>
          );
        })()
      ) : reordering ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          showsVerticalScrollIndicator={false}>
          <Text variant="small" color={Palette.textMuted} style={{ marginBottom: Spacing.sm }}>
            Réorganise ou supprime les blocs, puis appuie sur « Terminé ».
          </Text>
          {blocks.map((b, index) => (
            <View key={b.id} style={styles.reorderRow}>
              <Ionicons name={iconFor(b)} size={18} color={Palette.textSecondary} />
              <Text variant="body" numberOfLines={1} style={{ flex: 1 }}>
                {previewFor(b)}
              </Text>
              <Pressable
                hitSlop={8}
                disabled={index === 0}
                onPress={() => move(b.id, -1)}
                style={index === 0 ? styles.ctrlDisabled : undefined}>
                <Ionicons name="chevron-up" size={22} color={Palette.text} />
              </Pressable>
              <Pressable
                hitSlop={8}
                disabled={index === blocks.length - 1}
                onPress={() => move(b.id, 1)}
                style={index === blocks.length - 1 ? styles.ctrlDisabled : undefined}>
                <Ionicons name="chevron-down" size={22} color={Palette.text} />
              </Pressable>
              <Pressable hitSlop={8} onPress={() => confirmRemove(b)}>
                <Ionicons name="trash-outline" size={19} color={Palette.textMuted} />
              </Pressable>
            </View>
          ))}
          <View style={{ height: 24 }} />
        </ScrollView>
      ) : RICH_EDITOR ? (
        <View style={{ flex: 1 }}>
          <View style={styles.richHeader}>
            <TextInput
              style={styles.title}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de la leçon"
              placeholderTextColor={Palette.textMuted}
              multiline
            />
            <View style={[styles.titleRule, { backgroundColor: color }]} />
          </View>
          <LessonRichEditor
            lessonId={lessonId}
            initialContent={content}
            initialBlocks={blocks}
            onSaving={() => setSaveState('saving')}
            onSaved={() => setSaveState('saved')}
          />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
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
                Ajoute un titre, du texte, une image ou un PDF avec la barre en bas. Appuie
                longuement sur un bloc pour le déplacer, le transformer ou le supprimer.
              </Text>
            ) : (
              blocks.map(renderBlock)
            )}
            <View style={{ height: 24 }} />
        </ScrollView>
      )}

      {/* Barre contextuelle : mise en forme du bloc actif, sinon insertion */}
      {!RICH_EDITOR && !loading && tab === 'notes' && !reordering ? (
        focusedBlock ? (
            <View style={[styles.toolbar, { paddingBottom: insets.bottom + Spacing.sm }]}>
              <Pressable
                style={[styles.fmtBtn, focusedBlock.type === 'heading' && styles.fmtActive]}
                onPress={() => changeType(focusedBlock.id, 'heading')}
                accessibilityLabel="Titre">
                <Ionicons
                  name="text"
                  size={19}
                  color={focusedBlock.type === 'heading' ? color : Palette.text}
                />
              </Pressable>
              <Pressable
                style={[styles.fmtBtn, focusedBlock.type === 'subheading' && styles.fmtActive]}
                onPress={() => changeType(focusedBlock.id, 'subheading')}
                accessibilityLabel="Sous-titre">
                <Ionicons
                  name="text-outline"
                  size={17}
                  color={focusedBlock.type === 'subheading' ? color : Palette.text}
                />
              </Pressable>
              <Pressable
                style={[styles.fmtBtn, focusedBlock.type === 'text' && styles.fmtActive]}
                onPress={() => changeType(focusedBlock.id, 'text')}
                accessibilityLabel="Texte">
                <Ionicons
                  name="reorder-four-outline"
                  size={18}
                  color={focusedBlock.type === 'text' ? color : Palette.text}
                />
              </Pressable>
              <View style={styles.fmtSep} />
              <Pressable
                style={styles.fmtBtn}
                onPress={() => setColorPicker(focusedBlock)}
                accessibilityLabel="Couleur">
                <View style={[styles.fmtColorDot, { backgroundColor: focusedBlock.color ?? '#FFFFFF' }]} />
              </Pressable>
              <Pressable
                style={styles.fmtBtn}
                onPress={() => setFontPicker(focusedBlock)}
                accessibilityLabel="Police">
                <Text style={styles.fontBtnLabel}>Aa</Text>
              </Pressable>
              <Pressable
                style={styles.fmtBtn}
                onPress={() => confirmRemove(focusedBlock)}
                accessibilityLabel="Supprimer">
                <Ionicons name="trash-outline" size={18} color={Palette.textMuted} />
              </Pressable>
              <View style={{ flex: 1 }} />
              <Pressable
                style={[styles.fmtBtn, styles.fmtAdd]}
                onPress={insertMenu}
                accessibilityLabel="Insérer">
                <Ionicons name="add" size={22} color={Palette.onPrimary} />
              </Pressable>
            </View>
          ) : (
            <View style={[styles.toolbar, { paddingBottom: insets.bottom + Spacing.sm }]}>
              <Pressable style={styles.tool} onPress={() => addTextBlock('heading')}>
                <Ionicons name="text" size={18} color={Palette.text} />
                <Text variant="small" color={Palette.textSecondary}>
                  Titre
                </Text>
              </Pressable>
              <Pressable style={styles.tool} onPress={() => addTextBlock('subheading')}>
                <Ionicons name="text-outline" size={18} color={Palette.text} />
                <Text variant="small" color={Palette.textSecondary}>
                  Sous-titre
                </Text>
              </Pressable>
              <Pressable style={styles.tool} onPress={() => addTextBlock('text')}>
                <Ionicons name="reorder-four-outline" size={18} color={Palette.text} />
                <Text variant="small" color={Palette.textSecondary}>
                  Texte
                </Text>
              </Pressable>
              <Pressable style={styles.tool} onPress={attachMenu}>
                <Ionicons name="attach" size={18} color={Palette.text} />
                <Text variant="small" color={Palette.textSecondary}>
                  Joindre
                </Text>
              </Pressable>
            </View>
          )
      ) : null}

      {/* Overlay d'upload */}
      {busy ? (
        <View style={styles.uploadOverlay}>
          <View style={styles.uploadCard}>
            <ActivityIndicator color={Palette.primary} />
            <Text variant="small" color={Palette.textSecondary}>
              Ajout du fichier…
            </Text>
          </View>
        </View>
      ) : null}

      {/* Visionneuse image plein écran */}
      <Modal
        visible={!!viewer}
        transparent
        animationType="fade"
        onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewer(null)}>
          {viewer ? <Image source={{ uri: viewer }} style={styles.viewerImage} resizeMode="contain" /> : null}
        </Pressable>
      </Modal>

      {/* Feuille : couleur d'un bloc */}
      <Modal
        visible={!!colorPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setColorPicker(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setColorPicker(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Text variant="heading" style={{ marginBottom: Spacing.md }}>
              Couleur du bloc
            </Text>
            <View style={styles.colorRow}>
              {LESSON_TEXT_COLORS.map((c) => {
                const active = (colorPicker?.color ?? '#FFFFFF') === c;
                return (
                  <Pressable
                    key={c}
                    onPress={() => {
                      if (colorPicker) changeColor(colorPicker.id, c === '#FFFFFF' ? undefined : c);
                      setColorPicker(null);
                    }}
                    accessibilityLabel={`Couleur ${c}`}>
                    <View style={[styles.colorDot, { backgroundColor: c }, active && styles.colorDotActive]}>
                      {active ? <Ionicons name="checkmark" size={16} color="#06130C" /> : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Feuille : police d'un bloc */}
      <Modal
        visible={!!fontPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setFontPicker(null)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setFontPicker(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.lg }]}>
            <Text variant="heading" style={{ marginBottom: Spacing.sm }}>
              Police du bloc
            </Text>
            {LESSON_FONTS.map((f) => {
              const active = (fontPicker?.font ?? 'default') === f.key;
              return (
                <Pressable
                  key={f.key}
                  onPress={() => {
                    if (fontPicker) changeFont(fontPicker.id, f.key);
                    setFontPicker(null);
                  }}
                  style={styles.fontOption}>
                  <Text
                    style={[
                      styles.fontOptionLabel,
                      FONT_SAMPLE[f.key] ? { fontFamily: FONT_SAMPLE[f.key] } : null,
                    ]}>
                    {f.label}
                  </Text>
                  {active ? <Ionicons name="checkmark" size={18} color={color} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Lecteur PDF intégré (iOS) */}
      <Modal visible={!!pdfViewer} animationType="slide" onRequestClose={() => setPdfViewer(null)}>
        <View style={styles.pdfViewer}>
          <View style={[styles.pdfBar, { paddingTop: insets.top + Spacing.xs }]}>
            <Pressable onPress={() => setPdfViewer(null)} hitSlop={12} accessibilityLabel="Fermer">
              <Ionicons name="close" size={26} color={Palette.text} />
            </Pressable>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
              {pdfViewer?.name}
            </Text>
            <Pressable
              onPress={() => pdfViewer && Linking.openURL(pdfViewer.url)}
              hitSlop={12}
              accessibilityLabel="Ouvrir ailleurs">
              <Ionicons name="open-outline" size={22} color={Palette.text} />
            </Pressable>
          </View>
          {pdfViewer ? (
            <WebView
              source={{ uri: pdfViewer.url }}
              style={{ flex: 1, backgroundColor: Palette.background }}
              startInLoadingState
              renderLoading={() => (
                <View style={styles.center}>
                  <ActivityIndicator color={color} />
                </View>
              )}
            />
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  richHeader: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  tabs: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  tab: {
    flex: 1,
    height: 38,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  thumb: {
    borderRadius: Radius.md,
    overflow: 'hidden',
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImg: { width: '100%', height: '100%' },
  saveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 },
  reorderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  ctrlDisabled: { opacity: 0.3 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  body: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  title: { color: Palette.text, ...Type.display, padding: 0 },
  titleRule: { width: 44, height: 4, borderRadius: 2, marginTop: Spacing.sm, marginBottom: Spacing.md },
  hint: { lineHeight: 22, marginTop: Spacing.sm },
  block: { color: Palette.text, paddingHorizontal: 0 },
  bHeading: {
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 29,
    letterSpacing: -0.3,
    marginTop: Spacing.md,
    paddingVertical: 2,
  },
  bSubheading: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
    marginTop: Spacing.sm,
    paddingVertical: 2,
  },
  bText: { fontSize: 15, fontWeight: '400', lineHeight: 24, paddingVertical: Spacing.xs },
  imageWrap: {
    marginVertical: Spacing.sm,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Palette.surface,
  },
  image: { width: '100%', height: 220 },
  mediaLoading: { height: 220, alignItems: 'center', justifyContent: 'center' },
  pdfCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
  },
  pdfIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
    gap: 5,
    height: 44,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
  },
  fmtBtn: {
    width: 38,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
    marginRight: 6,
  },
  fmtActive: { backgroundColor: Palette.primarySurface },
  fmtSep: { width: StyleSheet.hairlineWidth, height: 26, backgroundColor: Palette.border, marginRight: 6 },
  fmtColorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.border,
  },
  fmtAdd: { backgroundColor: Palette.primary, marginRight: 0 },
  fontBtnLabel: { fontFamily: 'Lora_700Bold', fontSize: 16, color: Palette.text },
  fontOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  fontOptionLabel: { fontSize: 18, color: Palette.text },
  uploadOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  uploadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surfaceElevated,
  },
  viewerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: { width: '100%', height: '100%' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Palette.surfaceElevated,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  colorDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: { borderColor: Palette.text },
  pdfViewer: { flex: 1, backgroundColor: Palette.background },
  pdfBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
});
