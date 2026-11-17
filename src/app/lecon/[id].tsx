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
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  getLesson,
  listLessonAttachments,
  removeLessonAttachment,
  renameLesson,
  saveLessonNote,
  setAttachmentFavorite,
  signedUrlFor,
  uploadAndAddAttachment,
  type LessonAttachment,
  type LessonAttachmentKind,
} from '@/lib/courses';

// Contournement typage ref WebView sous React 19 (runtime inchangé).
const WV = WebView as unknown as React.ComponentType<any>;

/** Déduit le type de ressource depuis le mime (puis l'extension). */
function kindOf(mime?: string | null, name?: string | null): LessonAttachmentKind {
  const m = (mime ?? '').toLowerCase();
  if (m.startsWith('image/')) return 'image';
  if (m === 'application/pdf') return 'pdf';
  if (m.startsWith('audio/')) return 'audio';
  if (m) return 'document';
  const ext = (name ?? '').split('.').pop()?.toLowerCase();
  if (ext && ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic', 'heif'].includes(ext)) return 'image';
  if (ext === 'pdf') return 'pdf';
  if (ext && ['mp3', 'wav', 'm4a', 'aac', 'ogg'].includes(ext)) return 'audio';
  return 'document';
}

function iconFor(kind: LessonAttachmentKind): keyof typeof Ionicons.glyphMap {
  if (kind === 'pdf') return 'document-text';
  if (kind === 'audio') return 'musical-notes';
  if (kind === 'document') return 'document';
  return 'image';
}

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
  const [note, setNote] = useState('');
  const [items, setItems] = useState<LessonAttachment[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<string | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);

  const noteRef = useRef('');
  const titleRef = useRef(title);
  const savedNoteRef = useRef('');
  const savedTitleRef = useRef(title);
  noteRef.current = note;
  titleRef.current = title;

  const reload = useCallback(async () => {
    if (!lessonId) return;
    try {
      const list = await listLessonAttachments(lessonId);
      setItems(list);
    } catch {
      // réseau : on garde l'existant, on réessaiera
    }
  }, [lessonId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!lessonId) {
        setLoading(false);
        return;
      }
      try {
        const l = await getLesson(lessonId);
        if (alive && l) {
          setTitle(l.title);
          savedTitleRef.current = l.title;
          setNote(l.note ?? '');
          savedNoteRef.current = l.note ?? '';
        }
        const list = await listLessonAttachments(lessonId);
        if (alive) setItems(list);
      } catch {
        // écran reste utilisable
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [lessonId]);

  // Résout les URLs signées des images (miniatures).
  useEffect(() => {
    const missing = items.filter((i) => i.kind === 'image' && !urls[i.storage_path]);
    if (missing.length === 0) return;
    let alive = true;
    (async () => {
      for (const i of missing) {
        try {
          const u = await signedUrlFor(i.storage_path);
          if (alive) setUrls((p) => ({ ...p, [i.storage_path]: u }));
        } catch {
          // on réessaiera
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [items, urls]);

  // Autosave de la note + du titre.
  const persist = useCallback(async () => {
    if (!lessonId) return;
    try {
      setSaveState('saving');
      if (noteRef.current !== savedNoteRef.current) {
        await saveLessonNote(lessonId, noteRef.current);
        savedNoteRef.current = noteRef.current;
      }
      if (titleRef.current.trim() && titleRef.current !== savedTitleRef.current) {
        await renameLesson(lessonId, titleRef.current.trim());
        savedTitleRef.current = titleRef.current;
      }
      setSaveState('saved');
    } catch {
      setSaveState('idle');
    }
  }, [lessonId]);

  useEffect(() => {
    if (loading) return;
    setSaveState('idle');
    const t = setTimeout(persist, 700);
    return () => clearTimeout(t);
  }, [note, title, loading, persist]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/cours');
  };

  // --- Ajout de ressources ---
  const addFrom = async (
    kind: LessonAttachmentKind,
    asset: { uri: string; name?: string; mime?: string; size?: number },
  ) => {
    if (!userId || !lessonId) return;
    setBusy(true);
    try {
      const created = await uploadAndAddAttachment({
        userId,
        lessonId,
        kind,
        uri: asset.uri,
        name: asset.name,
        mime: asset.mime,
        sizeBytes: asset.size,
      });
      setItems((prev) => [...prev, created]);
    } catch {
      Alert.alert('Oups', "Le fichier n'a pas pu être ajouté. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Appareil photo', "Autorise l'accès à l'appareil photo.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (res.canceled) return;
    const a = res.assets[0];
    await addFrom('image', {
      uri: a.uri,
      name: a.fileName ?? undefined,
      mime: a.mimeType ?? 'image/jpeg',
      size: a.fileSize,
    });
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', "Autorise l'accès à tes photos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 0.8,
      allowsMultipleSelection: true,
    });
    if (res.canceled) return;
    for (const a of res.assets) {
      await addFrom('image', {
        uri: a.uri,
        name: a.fileName ?? undefined,
        mime: a.mimeType ?? 'image/jpeg',
        size: a.fileSize,
      });
    }
  };

  const pickDocuments = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: '*/*',
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    for (const a of res.assets) {
      await addFrom(kindOf(a.mimeType, a.name), {
        uri: a.uri,
        name: a.name,
        mime: a.mimeType ?? undefined,
        size: a.size ?? undefined,
      });
    }
  };

  const addMenu = () => {
    Alert.alert('Ajouter à la leçon', undefined, [
      { text: 'Prendre une photo', onPress: takePhoto },
      { text: 'Importer des images', onPress: pickImages },
      { text: 'Importer un document', onPress: pickDocuments },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  // --- Ouvrir / agir sur une ressource ---
  const open = async (it: LessonAttachment) => {
    try {
      const u = urls[it.storage_path] ?? (await signedUrlFor(it.storage_path));
      setUrls((p) => ({ ...p, [it.storage_path]: u }));
      if (it.kind === 'image') setViewer(u);
      else if (it.kind === 'pdf' && Platform.OS === 'ios')
        setPdfViewer({ url: u, name: it.name ?? 'Document' });
      else Linking.openURL(u);
    } catch {
      Alert.alert('Oups', "Impossible d'ouvrir ce fichier.");
    }
  };

  const toggleFav = async (it: LessonAttachment) => {
    const fav = !it.favorite;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, favorite: fav } : x)));
    try {
      await setAttachmentFavorite(it.id, fav);
    } catch {
      setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, favorite: !fav } : x)));
    }
  };

  const confirmRemove = (it: LessonAttachment) => {
    Alert.alert('Supprimer', `Supprimer « ${it.name ?? 'ce fichier'} » ?`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setItems((prev) => prev.filter((x) => x.id !== it.id));
          try {
            await removeLessonAttachment(it);
          } catch {
            reload();
          }
        },
      },
    ]);
  };

  const itemMenu = (it: LessonAttachment) => {
    Alert.alert(it.name ?? 'Ressource', undefined, [
      { text: 'Ouvrir', onPress: () => open(it) },
      { text: it.favorite ? 'Retirer des favoris' : 'Mettre en favori', onPress: () => toggleFav(it) },
      { text: 'Supprimer', style: 'destructive', onPress: () => confirmRemove(it) },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Pressable onPress={back} hitSlop={12} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Pressable>
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
        <Pressable onPress={addMenu} hitSlop={10} accessibilityLabel="Ajouter" disabled={busy}>
          {busy ? (
            <ActivityIndicator size="small" color={color} />
          ) : (
            <Ionicons name="add-circle" size={30} color={color} />
          )}
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color} />
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

          {/* Note simple */}
          <Text variant="small" color={Palette.textSecondary} style={styles.sectionLabel}>
            Note
          </Text>
          <TextInput
            style={styles.note}
            value={note}
            onChangeText={setNote}
            placeholder="Écris une note, un rappel, l'essentiel du cours…"
            placeholderTextColor={Palette.textMuted}
            multiline
          />

          {/* Ressources */}
          <View style={styles.resHeader}>
            <Text variant="heading">Ressources</Text>
            {items.length > 0 ? (
              <Text variant="small" color={Palette.textSecondary}>
                {items.length}
              </Text>
            ) : null}
          </View>

          {items.length === 0 ? (
            <EmptyState
              icon="folder-open-outline"
              eyebrow="Ta leçon"
              title="Ajoute tes documents et images"
              subtitle="Importe des PDF, des photos ou des documents : tu les retrouveras ici, bien rangés.">
              <Pressable onPress={addMenu} style={[styles.addBtn, { backgroundColor: color }]}>
                <Ionicons name="add" size={20} color={Palette.onPrimary} />
                <Text variant="bodyStrong" color={Palette.onPrimary}>
                  Ajouter
                </Text>
              </Pressable>
            </EmptyState>
          ) : (
            items.map((it) => {
              const thumb = it.kind === 'image' ? urls[it.storage_path] : undefined;
              return (
                <Pressable
                  key={it.id}
                  onPress={() => open(it)}
                  onLongPress={() => itemMenu(it)}
                  style={styles.card}>
                  <View style={styles.thumb}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.thumbImg} resizeMode="cover" />
                    ) : (
                      <Ionicons name={iconFor(it.kind)} size={24} color={color} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {it.name ?? 'Sans nom'}
                    </Text>
                    <Text variant="small" color={Palette.textMuted}>
                      {it.kind === 'pdf'
                        ? 'PDF'
                        : it.kind === 'image'
                          ? 'Image'
                          : it.kind === 'audio'
                            ? 'Audio'
                            : 'Document'}
                    </Text>
                  </View>
                  <Pressable onPress={() => toggleFav(it)} hitSlop={10} style={styles.star}>
                    <Ionicons
                      name={it.favorite ? 'star' : 'star-outline'}
                      size={20}
                      color={it.favorite ? Palette.gold : Palette.textMuted}
                    />
                  </Pressable>
                  <Pressable onPress={() => itemMenu(it)} hitSlop={10}>
                    <Ionicons name="ellipsis-horizontal" size={20} color={Palette.textMuted} />
                  </Pressable>
                </Pressable>
              );
            })
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Visionneuse image plein écran */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={() => setViewer(null)}>
        <Pressable style={styles.viewerBackdrop} onPress={() => setViewer(null)}>
          {viewer ? (
            <Image source={{ uri: viewer }} style={styles.viewerImg} resizeMode="contain" />
          ) : null}
        </Pressable>
      </Modal>

      {/* Visionneuse PDF (iOS) */}
      <Modal visible={!!pdfViewer} animationType="slide" onRequestClose={() => setPdfViewer(null)}>
        <View style={[styles.pdfRoot, { paddingTop: insets.top }]}>
          <View style={styles.pdfHeader}>
            <Pressable onPress={() => setPdfViewer(null)} hitSlop={10}>
              <Text variant="bodyStrong" color={color}>
                Fermer
              </Text>
            </Pressable>
            <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1, textAlign: 'center' }}>
              {pdfViewer?.name}
            </Text>
            <View style={{ width: 48 }} />
          </View>
          {pdfViewer ? (
            <WV source={{ uri: pdfViewer.url }} style={{ flex: 1, backgroundColor: Palette.background }} />
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  saveBadge: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  body: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  title: { fontSize: 26, fontWeight: '800', color: Palette.text, paddingVertical: Spacing.xs },
  titleRule: { height: 3, width: 48, borderRadius: 2, marginBottom: Spacing.lg },
  sectionLabel: { marginBottom: Spacing.xs, textTransform: 'uppercase', letterSpacing: 1 },
  note: {
    minHeight: 96,
    fontSize: 16,
    lineHeight: 24,
    color: Palette.text,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    textAlignVertical: 'top',
    marginBottom: Spacing.xl,
  },
  resHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.sm,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    marginBottom: Spacing.sm,
  },
  thumb: {
    width: 52,
    height: 52,
    borderRadius: Radius.md,
    backgroundColor: Palette.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  thumbImg: { width: '100%', height: '100%' },
  star: { padding: 2 },
  viewerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' },
  viewerImg: { width: '100%', height: '100%' },
  pdfRoot: { flex: 1, backgroundColor: Palette.background },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
