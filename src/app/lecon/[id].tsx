import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
  renameLessonAttachment,
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

type DocMeta = { icon: keyof typeof Ionicons.glyphMap; color: string; label: string };

/** Icône, couleur et libellé selon le type de fichier (pour reconnaître d'un coup d'œil). */
function docMeta(it: { kind: LessonAttachmentKind; mime?: string | null; name?: string | null }): DocMeta {
  const name = (it.name ?? '').toLowerCase();
  const mime = (it.mime ?? '').toLowerCase();
  const ext = name.includes('.') ? name.split('.').pop() ?? '' : '';
  if (it.kind === 'image') return { icon: 'image', color: Palette.primary, label: 'Image' };
  if (it.kind === 'pdf') return { icon: 'document-text', color: '#FF5A5F', label: 'PDF' };
  if (it.kind === 'audio') return { icon: 'musical-notes', color: '#A855F7', label: 'Audio' };
  if (/word|msword|wordprocessingml/.test(mime) || ['doc', 'docx'].includes(ext))
    return { icon: 'document-text', color: '#2B7CD3', label: 'Word' };
  if (/excel|spreadsheetml|ms-excel/.test(mime) || ['xls', 'xlsx'].includes(ext))
    return { icon: 'grid', color: '#1E9E5A', label: 'Excel' };
  if (ext === 'csv' || mime === 'text/csv') return { icon: 'grid', color: '#1E9E5A', label: 'CSV' };
  if (/powerpoint|presentationml/.test(mime) || ['ppt', 'pptx'].includes(ext))
    return { icon: 'easel', color: '#E8853B', label: 'PowerPoint' };
  if (['zip', 'rar', '7z'].includes(ext)) return { icon: 'archive', color: '#9AA0A6', label: 'Archive' };
  if (['txt', 'md', 'rtf'].includes(ext)) return { icon: 'document', color: '#9AA0A6', label: 'Texte' };
  return { icon: 'document', color: '#9AA0A6', label: 'Document' };
}

function formatSize(bytes?: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

/**
 * Normalise une image vers JPEG (gère le HEIC de l'iPhone) et borne la taille.
 * Garantit un affichage correct partout. Renvoie un URI local JPEG.
 */
async function normalizeImage(uri: string, width?: number): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    if (width && width > 2400) ctx.resize({ width: 2400 });
    const ref = await ctx.renderAsync();
    const out = await ref.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    return out.uri;
  } catch {
    return uri; // à défaut, on garde l'original
  }
}

function toJpgName(name?: string | null): string | undefined {
  if (!name) return undefined;
  return name.replace(/\.[^.]+$/, '') + '.jpg';
}

type SaveState = 'idle' | 'saving' | 'saved';

export default function LeconScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
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
  const [gallery, setGallery] = useState<{ index: number } | null>(null);
  const [pdfViewer, setPdfViewer] = useState<{ url: string; name: string } | null>(null);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'images' | 'docs' | 'fav'>('all');
  const [sort, setSort] = useState<'recent' | 'name'>('recent');
  const [renaming, setRenaming] = useState<LessonAttachment | null>(null);
  const [renameText, setRenameText] = useState('');

  const imageItems = items.filter((i) => i.kind === 'image');
  const tileW = (screenW - Spacing.lg * 2 - Spacing.md) / 2;

  // Filtre + recherche + tri pour retrouver facilement.
  const q = query.trim().toLowerCase();
  const visibleItems = items
    .filter(
      (i) =>
        filter === 'all' ||
        (filter === 'images' && i.kind === 'image') ||
        (filter === 'docs' && i.kind !== 'image') ||
        (filter === 'fav' && i.favorite),
    )
    .filter((i) => !q || (i.name ?? '').toLowerCase().includes(q))
    .sort((a, b) =>
      sort === 'name'
        ? (a.name ?? '').localeCompare(b.name ?? '')
        : (b.created_at ?? '').localeCompare(a.created_at ?? ''),
    );

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
    const res = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (res.canceled) return;
    const a = res.assets[0];
    const uri = await normalizeImage(a.uri, a.width);
    await addFrom('image', { uri, name: toJpgName(a.fileName) ?? 'photo.jpg', mime: 'image/jpeg' });
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', "Autorise l'accès à tes photos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      allowsMultipleSelection: true,
    });
    if (res.canceled) return;
    for (const a of res.assets) {
      const uri = await normalizeImage(a.uri, a.width);
      await addFrom('image', { uri, name: toJpgName(a.fileName) ?? 'image.jpg', mime: 'image/jpeg' });
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
      if (it.kind === 'image') {
        const missing = imageItems.filter((i) => !urls[i.storage_path]);
        if (missing.length) {
          const entries = await Promise.all(
            missing.map(async (i) => [i.storage_path, await signedUrlFor(i.storage_path)] as const),
          );
          setUrls((p) => ({ ...p, ...Object.fromEntries(entries) }));
        }
        const index = imageItems.findIndex((i) => i.id === it.id);
        setGallery({ index: Math.max(0, index) });
        return;
      }
      const u = urls[it.storage_path] ?? (await signedUrlFor(it.storage_path));
      setUrls((p) => ({ ...p, [it.storage_path]: u }));
      if (it.kind === 'pdf' && Platform.OS === 'ios')
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

  const openRename = (it: LessonAttachment) => {
    setRenameText(it.name ?? '');
    setRenaming(it);
  };

  const submitRename = async () => {
    const it = renaming;
    const name = renameText.trim();
    setRenaming(null);
    if (!it || !name || name === it.name) return;
    setItems((prev) => prev.map((x) => (x.id === it.id ? { ...x, name } : x)));
    try {
      await renameLessonAttachment(it.id, name);
    } catch {
      reload();
    }
  };

  const itemMenu = (it: LessonAttachment) => {
    Alert.alert(it.name ?? 'Ressource', undefined, [
      { text: 'Ouvrir', onPress: () => open(it) },
      { text: 'Renommer', onPress: () => openRename(it) },
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
            <View style={styles.resHeaderLeft}>
              <Text variant="heading">Ressources</Text>
              {items.length > 0 ? (
                <Text variant="small" color={Palette.textSecondary}>
                  {items.length}
                </Text>
              ) : null}
            </View>
            {items.length > 0 ? (
              <View style={styles.viewToggle}>
                <Pressable
                  onPress={() => setView('list')}
                  style={[styles.viewBtn, view === 'list' && styles.viewBtnActive]}
                  accessibilityLabel="Vue liste">
                  <Ionicons
                    name="list"
                    size={18}
                    color={view === 'list' ? Palette.onPrimary : Palette.textSecondary}
                  />
                </Pressable>
                <Pressable
                  onPress={() => setView('grid')}
                  style={[styles.viewBtn, view === 'grid' && styles.viewBtnActive]}
                  accessibilityLabel="Vue grille">
                  <Ionicons
                    name="grid"
                    size={16}
                    color={view === 'grid' ? Palette.onPrimary : Palette.textSecondary}
                  />
                </Pressable>
              </View>
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
            <>
              <View style={styles.toolbar}>
                <View style={styles.searchBox}>
                  <Ionicons name="search" size={16} color={Palette.textMuted} />
                  <TextInput
                    style={styles.searchInput}
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Rechercher…"
                    placeholderTextColor={Palette.textMuted}
                    returnKeyType="search"
                  />
                  {query ? (
                    <Pressable onPress={() => setQuery('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={16} color={Palette.textMuted} />
                    </Pressable>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => setSort((s) => (s === 'recent' ? 'name' : 'recent'))}
                  style={styles.sortBtn}
                  accessibilityLabel="Changer le tri">
                  <Ionicons
                    name={sort === 'name' ? 'text' : 'time-outline'}
                    size={16}
                    color={Palette.text}
                  />
                  <Text variant="small" color={Palette.text}>
                    {sort === 'name' ? 'Nom' : 'Récent'}
                  </Text>
                </Pressable>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.chipsRow}>
                {(
                  [
                    ['all', 'Tout'],
                    ['images', 'Images'],
                    ['docs', 'Documents'],
                    ['fav', 'Favoris'],
                  ] as const
                ).map(([k, label]) => (
                  <Pressable
                    key={k}
                    onPress={() => setFilter(k)}
                    style={[styles.chip, filter === k && styles.chipActive]}>
                    <Text
                      variant="small"
                      color={filter === k ? Palette.onPrimary : Palette.textSecondary}>
                      {label}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              {visibleItems.length === 0 ? (
                <View style={{ alignItems: 'center', marginTop: Spacing.xl, gap: Spacing.md }}>
                  <Text variant="body" color={Palette.textMuted}>
                    Aucun résultat.
                  </Text>
                  <Pressable
                    onPress={() => {
                      setQuery('');
                      setFilter('all');
                    }}
                    style={styles.resetBtn}>
                    <Text variant="small" color={Palette.text}>
                      Réinitialiser
                    </Text>
                  </Pressable>
                </View>
              ) : view === 'grid' ? (
                <View style={styles.gridWrap}>
                  {visibleItems.map((it) => {
                const thumb = it.kind === 'image' ? urls[it.storage_path] : undefined;
                const meta = docMeta(it);
                return (
                  <Pressable
                    key={it.id}
                    onPress={() => open(it)}
                    onLongPress={() => itemMenu(it)}
                    accessibilityLabel={`${it.name ?? 'Sans nom'}, ${meta.label}`}
                    style={[styles.tile, { width: tileW }]}>
                    <View style={[styles.tileThumb, !thumb && { backgroundColor: meta.color + '22' }]}>
                      {thumb ? (
                        <Image source={{ uri: thumb }} style={styles.tileImg} resizeMode="cover" />
                      ) : it.kind === 'image' ? (
                        <ActivityIndicator color={meta.color} />
                      ) : (
                        <Ionicons name={meta.icon} size={34} color={meta.color} />
                      )}
                      {it.favorite ? (
                        <View style={styles.tileStar}>
                          <Ionicons name="star" size={13} color={Palette.gold} />
                        </View>
                      ) : null}
                    </View>
                    <Text variant="small" numberOfLines={2} style={styles.tileName}>
                      {it.name ?? 'Sans nom'}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
              ) : (
                visibleItems.map((it) => {
                  const thumb = it.kind === 'image' ? urls[it.storage_path] : undefined;
                  const meta = docMeta(it);
                  const size = formatSize(it.size_bytes);
              return (
                <Pressable
                  key={it.id}
                  onPress={() => open(it)}
                  onLongPress={() => itemMenu(it)}
                  accessibilityLabel={`${it.name ?? 'Sans nom'}, ${meta.label}`}
                  style={styles.card}>
                  <View style={[styles.thumb, !thumb && { backgroundColor: meta.color + '22' }]}>
                    {thumb ? (
                      <Image source={{ uri: thumb }} style={styles.thumbImg} resizeMode="cover" />
                    ) : it.kind === 'image' ? (
                      <ActivityIndicator size="small" color={meta.color} />
                    ) : (
                      <Ionicons name={meta.icon} size={24} color={meta.color} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" numberOfLines={1}>
                      {it.name ?? 'Sans nom'}
                    </Text>
                    <Text variant="small" color={Palette.textMuted}>
                      {size ? `${meta.label} · ${size}` : meta.label}
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
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Visionneuse galerie : swipe entre images + zoom (pincement) */}
      <Modal
        visible={!!gallery}
        animationType="fade"
        onRequestClose={() => setGallery(null)}
        statusBarTranslucent>
        <View style={styles.galleryRoot}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            contentOffset={{ x: (gallery?.index ?? 0) * screenW, y: 0 }}>
            {imageItems.map((item) => (
              <ScrollView
                key={item.id}
                style={{ width: screenW, height: screenH }}
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
                maximumZoomScale={4}
                minimumZoomScale={1}
                centerContent
                showsVerticalScrollIndicator={false}
                showsHorizontalScrollIndicator={false}>
                <Image
                  source={{ uri: urls[item.storage_path] }}
                  style={{ width: screenW, height: screenH }}
                  resizeMode="contain"
                />
              </ScrollView>
            ))}
          </ScrollView>
          <Pressable
            onPress={() => setGallery(null)}
            style={[styles.galleryClose, { top: insets.top + 8 }]}
            hitSlop={12}
            accessibilityLabel="Fermer">
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>
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

      {/* Renommer une ressource (iOS + Android) */}
      <Modal
        visible={!!renaming}
        transparent
        animationType="fade"
        onRequestClose={() => setRenaming(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.renameOverlay}>
          <Pressable style={styles.renameBackdrop} onPress={() => setRenaming(null)} />
          <View style={styles.renameCard}>
            <Text variant="heading" style={{ marginBottom: Spacing.md }}>
              Renommer
            </Text>
            <TextInput
              style={styles.renameInput}
              value={renameText}
              onChangeText={setRenameText}
              placeholder="Nom du fichier"
              placeholderTextColor={Palette.textMuted}
              autoFocus
              selectTextOnFocus
            />
            <View style={styles.renameActions}>
              <Pressable onPress={() => setRenaming(null)} style={styles.renameBtn}>
                <Text variant="bodyStrong" color={Palette.textSecondary}>
                  Annuler
                </Text>
              </Pressable>
              <Pressable onPress={submitRename} style={[styles.renameBtn, styles.renameBtnPrimary]}>
                <Text variant="bodyStrong" color={Palette.onPrimary}>
                  Renommer
                </Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
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
  resHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: 3,
    gap: 3,
  },
  viewBtn: { width: 34, height: 28, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center' },
  viewBtnActive: { backgroundColor: Palette.primary },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  tile: { marginBottom: Spacing.xs },
  tileThumb: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Radius.lg,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  tileImg: { width: '100%', height: '100%' },
  tileStar: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: { paddingHorizontal: 2 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  searchInput: { flex: 1, color: Palette.text, fontSize: 15, paddingVertical: 0 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  chipsRow: { gap: Spacing.sm, paddingVertical: 2, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 7,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
  },
  chipActive: { backgroundColor: Palette.primary },
  resetBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: Palette.surface,
  },
  renameOverlay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  renameBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  renameCard: {
    width: '86%',
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  renameInput: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Palette.border,
    backgroundColor: Palette.background,
    color: Palette.text,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  renameActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.sm, marginTop: Spacing.md },
  renameBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.md },
  renameBtnPrimary: { backgroundColor: Palette.primary },
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
  galleryRoot: { flex: 1, backgroundColor: '#000' },
  galleryClose: {
    position: 'absolute',
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  pdfRoot: { flex: 1, backgroundColor: Palette.background },
  pdfHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
});
