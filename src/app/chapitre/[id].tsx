import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { Tappable } from '@/components/ui/Tappable';
import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  createNote,
  deleteDocument,
  deleteGeneratedContent,
  generateContent,
  listChapters,
  listDocuments,
  listGeneratedContent,
  moveDocument,
  renameDocument,
  saveGeneratedContent,
  signedUrlFor,
  updateNoteContent,
  uploadFileDocument,
  type Chapter,
  type DocItem,
  type GenItem,
  type GenKind,
} from '@/lib/courses';

const GEN_KINDS: { kind: GenKind; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { kind: 'quiz', label: 'Quiz', icon: 'help-circle-outline' },
  { kind: 'examen', label: 'Examen blanc', icon: 'school-outline' },
  { kind: 'fiche', label: 'Fiche de révision', icon: 'reader-outline' },
  { kind: 'flashcards', label: 'Flashcards', icon: 'albums-outline' },
  { kind: 'resume', label: 'Résumé', icon: 'document-text-outline' },
];
const GEN_ICON: Record<GenKind, keyof typeof Ionicons.glyphMap> = {
  quiz: 'help-circle',
  examen: 'school',
  fiche: 'reader',
  flashcards: 'albums',
  resume: 'document-text',
};
const GEN_LABEL: Record<GenKind, string> = {
  quiz: 'Quiz',
  examen: 'Examen blanc',
  fiche: 'Fiche',
  flashcards: 'Flashcards',
  resume: 'Résumé',
};

const KIND_ICON: Record<DocItem['kind'], keyof typeof Ionicons.glyphMap> = {
  pdf: 'document-text',
  image: 'image',
  note: 'create',
  text: 'reader',
};
const KIND_LABEL: Record<DocItem['kind'], string> = {
  pdf: 'PDF',
  image: 'Image',
  note: 'Note',
  text: 'Texte',
};

export default function ChapitreDocumentsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    subjectId?: string;
    name?: string;
    color?: string;
  }>();
  const chapterId = params.id;
  const subjectId = params.subjectId ?? '';
  const chapterName = params.name ?? 'Chapitre';
  const color = params.color ?? Palette.primary;
  const userId = session?.user?.id;

  const [docs, setDocs] = useState<DocItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  // Note en lecture/édition
  const [noteDoc, setNoteDoc] = useState<DocItem | null>(null);
  const [noteNew, setNoteNew] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);

  // Renommer un fichier
  const [renameDoc, setRenameDoc] = useState<DocItem | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Visionneuse image
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  // Déplacer vers un autre chapitre
  const [moveDoc, setMoveDoc] = useState<DocItem | null>(null);
  const [moveChapters, setMoveChapters] = useState<Chapter[]>([]);

  // Onglets Documents / Révisions (contenus générés)
  const [tab, setTab] = useState<'docs' | 'revs'>('docs');
  const [revs, setRevs] = useState<GenItem[]>([]);
  const [revsLoading, setRevsLoading] = useState(true);
  const [genKindOpen, setGenKindOpen] = useState(false);
  const [genKind, setGenKind] = useState<GenKind | null>(null);
  const [genContext, setGenContext] = useState('');
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    if (!chapterId) return;
    try {
      setDocs(await listDocuments(chapterId));
    } catch {
      // Pas d'invention : liste vide en cas d'échec.
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  const loadRevs = useCallback(async () => {
    if (!chapterId) return;
    try {
      setRevs(await listGeneratedContent(chapterId));
    } catch {
      // rien d'inventé
    } finally {
      setRevsLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    load();
    loadRevs();
  }, [load, loadRevs]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/cours');
  };

  /* ---------- Import ---------- */

  const runUpload = async (
    kind: 'pdf' | 'image',
    asset: { uri: string; name?: string; mime?: string; size?: number },
  ) => {
    if (!userId) return;
    setBusy(true);
    try {
      await uploadFileDocument({
        userId,
        subjectId,
        chapterId,
        kind,
        uri: asset.uri,
        name: asset.name,
        mime: asset.mime,
        size: asset.size,
      });
      await load();
    } catch {
      Alert.alert('Import impossible', "Le fichier n'a pas pu être importé. Réessaie dans un instant.");
    } finally {
      setBusy(false);
    }
  };

  const pickPdf = async () => {
    setAddOpen(false);
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await runUpload('pdf', { uri: a.uri, name: a.name, mime: a.mimeType, size: a.size ?? undefined });
  };

  const pickImage = async () => {
    setAddOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Autorisation requise', "Autorise l'accès aux photos pour importer une image.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.9 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await runUpload('image', {
      uri: a.uri,
      name: a.fileName ?? undefined,
      mime: a.mimeType,
      size: a.fileSize ?? undefined,
    });
  };

  const takePhoto = async () => {
    setAddOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Autorisation requise', "Autorise l'appareil photo pour prendre une photo de ton cours.");
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 0.9 });
    if (res.canceled || !res.assets?.[0]) return;
    const a = res.assets[0];
    await runUpload('image', {
      uri: a.uri,
      name: a.fileName ?? undefined,
      mime: a.mimeType,
      size: a.fileSize ?? undefined,
    });
  };

  /* ---------- Notes ---------- */

  const openNewNote = () => {
    setAddOpen(false);
    setNoteNew(true);
    setNoteDoc(null);
    setNoteTitle('');
    setNoteBody('');
  };

  const openNote = (d: DocItem) => {
    setNoteNew(false);
    setNoteDoc(d);
    setNoteTitle(d.title);
    setNoteBody(d.content ?? '');
  };

  const noteOpen = noteNew || noteDoc !== null;

  const saveNote = async () => {
    if (!userId) return;
    const body = noteBody;
    setNoteSaving(true);
    try {
      if (noteNew) await createNote(userId, subjectId, chapterId, noteTitle, body);
      else if (noteDoc) await updateNoteContent(noteDoc.id, noteTitle, body);
      setNoteNew(false);
      setNoteDoc(null);
      await load();
    } catch {
      Alert.alert('Oups', "La note n'a pas pu être enregistrée.");
    } finally {
      setNoteSaving(false);
    }
  };

  const closeNote = () => {
    if (noteSaving) return;
    setNoteNew(false);
    setNoteDoc(null);
  };

  /* ---------- Ouvrir / options ---------- */

  const openDoc = async (d: DocItem) => {
    if (d.kind === 'note' || d.kind === 'text') {
      openNote(d);
      return;
    }
    if (!d.storage_path) return;
    try {
      const url = await signedUrlFor(d.storage_path);
      if (d.kind === 'image') setImageUrl(url);
      else await WebBrowser.openBrowserAsync(url);
    } catch {
      Alert.alert('Oups', "Impossible d'ouvrir ce document pour le moment.");
    }
  };

  const onOptions = (d: DocItem) => {
    Alert.alert(d.title, KIND_LABEL[d.kind], [
      {
        text: 'Renommer',
        onPress: () => {
          if (d.kind === 'note' || d.kind === 'text') {
            openNote(d);
          } else {
            setRenameDoc(d);
            setRenameValue(d.title);
          }
        },
      },
      { text: 'Déplacer', onPress: () => openMove(d) },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Supprimer', `« ${d.title} » sera supprimé définitivement.`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: async () => {
                setDocs((prev) => prev.filter((x) => x.id !== d.id));
                try {
                  await deleteDocument(d);
                } catch {
                  load();
                }
              },
            },
          ]),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const openMove = async (d: DocItem) => {
    if (!subjectId) return;
    try {
      const all = await listChapters(subjectId);
      const others = all.filter((c) => c.id !== chapterId);
      if (others.length === 0) {
        Alert.alert(
          'Aucun autre chapitre',
          'Crée un autre chapitre dans cette matière pour pouvoir y déplacer ce document.',
        );
        return;
      }
      setMoveChapters(others);
      setMoveDoc(d);
    } catch {
      Alert.alert('Oups', "Impossible de charger les chapitres pour le moment.");
    }
  };

  const doMove = async (targetChapterId: string) => {
    const d = moveDoc;
    if (!d) return;
    setMoveDoc(null);
    setDocs((prev) => prev.filter((x) => x.id !== d.id)); // il quitte ce chapitre
    try {
      await moveDocument(d.id, targetChapterId);
    } catch {
      Alert.alert('Oups', "Le document n'a pas pu être déplacé.");
      load();
    }
  };

  const saveRename = async () => {
    if (!renameDoc || !renameValue.trim()) return;
    const d = renameDoc;
    const v = renameValue.trim();
    setRenameDoc(null);
    try {
      await renameDocument(d.id, v);
      await load();
    } catch {
      Alert.alert('Oups', "Le document n'a pas pu être renommé.");
    }
  };

  /* ---------- Génération IA ---------- */

  const pickGenKind = (k: GenKind) => {
    setGenKindOpen(false);
    setGenKind(k);
    // Sujet par défaut : le nom du chapitre. L'utilisateur peut coller/éditer son cours.
    setGenContext(chapterName);
  };

  const closeGen = () => {
    if (!generating) setGenKind(null);
  };

  const runGenerate = async () => {
    const kind = genKind;
    const ctx = genContext.trim();
    if (!kind || !userId || !ctx) return;
    setGenerating(true);
    try {
      const res = await generateContent(kind, ctx);
      if (!res.configured) {
        setGenerating(false);
        Alert.alert(
          'Génération IA à activer',
          "La génération par IA n'est pas encore activée sur ton compte. On la branche très bientôt — le reste de Mes cours fonctionne déjà.",
        );
        return;
      }
      if (res.error || !res.payload) {
        setGenerating(false);
        Alert.alert('Oups', 'La génération a échoué. Réessaie dans un instant.');
        return;
      }
      const saved = await saveGeneratedContent({
        userId,
        subjectId,
        chapterId,
        kind,
        title: res.title ?? GEN_LABEL[kind],
        payload: res.payload,
      });
      setGenKind(null);
      setGenerating(false);
      await loadRevs();
      router.push({ pathname: '/revision/[id]', params: { id: saved.id } });
    } catch {
      setGenerating(false);
      Alert.alert('Oups', 'La génération a échoué. Réessaie dans un instant.');
    }
  };

  const onRevOptions = (g: GenItem) => {
    Alert.alert(g.title, GEN_LABEL[g.kind], [
      { text: 'Ouvrir', onPress: () => router.push({ pathname: '/revision/[id]', params: { id: g.id } }) },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setRevs((prev) => prev.filter((x) => x.id !== g.id));
          try {
            await deleteGeneratedContent(g.id);
          } catch {
            loadRevs();
          }
        },
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  return (
    <Screen>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <View style={styles.headerTitle}>
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {chapterName}
          </Text>
        </View>
        <Tappable
          style={[styles.addBtn, { backgroundColor: color }]}
          onPress={() => (tab === 'docs' ? setAddOpen(true) : setGenKindOpen(true))}
          accessibilityLabel={tab === 'docs' ? 'Ajouter un document' : 'Générer un contenu'}>
          <Ionicons name="add" size={24} color="#06130C" />
        </Tappable>
      </View>

      {/* Onglets Documents / Révisions */}
      <View style={styles.segment}>
        <SegBtn label="Documents" active={tab === 'docs'} color={color} onPress={() => setTab('docs')} />
        <SegBtn label="Révisions" active={tab === 'revs'} color={color} onPress={() => setTab('revs')} />
      </View>

      {tab === 'revs' ? (
        revsLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={color} />
          </View>
        ) : revs.length === 0 ? (
          <EmptyState
            icon="sparkles-outline"
            title="Aucune révision"
            subtitle="Génère un quiz, une fiche, des flashcards, un résumé ou un examen blanc à partir de ce chapitre.">
            <Button label="Générer un contenu" onPress={() => setGenKindOpen(true)} />
          </EmptyState>
        ) : (
          <FlatList
            data={revs}
            keyExtractor={(g) => g.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Tappable
                style={styles.row}
                onPress={() => router.push({ pathname: '/revision/[id]', params: { id: item.id } })}
                haptic={false}>
                <View style={[styles.docIcon, { backgroundColor: color + '22' }]}>
                  <Ionicons name={GEN_ICON[item.kind]} size={22} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text variant="small" color={Palette.textMuted}>
                    {GEN_LABEL[item.kind]}
                  </Text>
                </View>
                <Pressable hitSlop={10} onPress={() => onRevOptions(item)} accessibilityLabel="Options">
                  <Ionicons name="ellipsis-horizontal" size={20} color={Palette.textMuted} />
                </Pressable>
              </Tappable>
            )}
          />
        )
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color} />
        </View>
      ) : docs.length === 0 ? (
        <EmptyState
          icon="folder-open-outline"
          title="Aucun document"
          subtitle="Importe un PDF, une photo de cours, ou écris une note : tout reste rangé dans ce chapitre.">
          <Button label="Ajouter un document" onPress={() => setAddOpen(true)} />
        </EmptyState>
      ) : (
        <FlatList
          data={docs}
          keyExtractor={(d) => d.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Tappable style={styles.row} onPress={() => openDoc(item)} haptic={false}>
              <View style={[styles.docIcon, { backgroundColor: color + '22' }]}>
                <Ionicons name={KIND_ICON[item.kind]} size={22} color={color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text variant="bodyStrong" numberOfLines={1}>
                  {item.title}
                </Text>
                <Text variant="small" color={Palette.textMuted}>
                  {KIND_LABEL[item.kind]}
                </Text>
              </View>
              <Pressable hitSlop={10} onPress={() => onOptions(item)} accessibilityLabel="Options">
                <Ionicons name="ellipsis-horizontal" size={20} color={Palette.textMuted} />
              </Pressable>
            </Tappable>
          )}
        />
      )}

      {busy ? (
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <ActivityIndicator color={Palette.primary} />
            <Text variant="small" color={Palette.textSecondary}>
              Import en cours…
            </Text>
          </View>
        </View>
      ) : null}

      {generating ? (
        <View style={styles.busyOverlay}>
          <View style={styles.busyCard}>
            <ActivityIndicator color={Palette.primary} />
            <Text variant="small" color={Palette.textSecondary}>
              Génération en cours…
            </Text>
          </View>
        </View>
      ) : null}

      {/* Feuille : choix du type de contenu à générer */}
      <Modal visible={genKindOpen} transparent animationType="fade" onRequestClose={() => setGenKindOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setGenKindOpen(false)}>
          <Pressable style={[styles.addSheet, { paddingBottom: insets.bottom + Spacing.md }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text variant="heading" style={{ marginBottom: Spacing.sm }}>
              Générer…
            </Text>
            {GEN_KINDS.map((g, i) => (
              <Tappable
                key={g.kind}
                style={[styles.addRow, i === GEN_KINDS.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => pickGenKind(g.kind)}
                haptic={false}>
                <View style={[styles.docIcon, { backgroundColor: color + '22' }]}>
                  <Ionicons name={g.icon} size={20} color={color} />
                </View>
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {g.label}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
              </Tappable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modale : contexte de génération */}
      <Modal visible={genKind !== null} transparent animationType="fade" onRequestClose={closeGen}>
        <Pressable style={styles.centerBackdrop} onPress={closeGen}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text variant="heading">{genKind ? GEN_LABEL[genKind] : ''}</Text>
              <Text variant="small" color={Palette.textSecondary}>
                Sur quel sujet ? Tu peux coller ton cours ou préciser le thème.
              </Text>
              <TextInput
                style={styles.genInput}
                placeholder="Ex. Les probabilités : définitions, formules, exemples…"
                placeholderTextColor={Palette.textMuted}
                value={genContext}
                onChangeText={setGenContext}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.modalActions}>
                <View style={{ flex: 1 }}>
                  <Button label="Annuler" variant="ghost" onPress={closeGen} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Générer" onPress={runGenerate} disabled={!genContext.trim() || generating} />
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Feuille d'ajout */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setAddOpen(false)}>
          <Pressable style={[styles.addSheet, { paddingBottom: insets.bottom + Spacing.md }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <AddRow icon="document-text-outline" label="Importer un PDF" onPress={pickPdf} />
            <AddRow icon="image-outline" label="Importer une photo" onPress={pickImage} />
            <AddRow icon="camera-outline" label="Prendre une photo" onPress={takePhoto} />
            <AddRow icon="create-outline" label="Écrire une note" onPress={openNewNote} />
          </Pressable>
        </Pressable>
      </Modal>

      {/* Note (lecture / édition) */}
      <Modal visible={noteOpen} transparent animationType="slide" onRequestClose={closeNote}>
        <View style={styles.noteWrap}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={[styles.noteHeader, { paddingTop: insets.top + Spacing.xs }]}>
              <Tappable onPress={closeNote} hitSlop={12} scaleTo={0.9} accessibilityLabel="Fermer">
                <Ionicons name="close" size={26} color={Palette.text} />
              </Tappable>
              <Text variant="heading">{noteNew ? 'Nouvelle note' : 'Note'}</Text>
              <Tappable onPress={saveNote} hitSlop={12} scaleTo={0.9} disabled={noteSaving}>
                <Text variant="bodyStrong" color={Palette.primary}>
                  {noteSaving ? '…' : 'Enregistrer'}
                </Text>
              </Tappable>
            </View>
            <TextInput
              style={styles.noteTitleInput}
              placeholder="Titre"
              placeholderTextColor={Palette.textMuted}
              value={noteTitle}
              onChangeText={setNoteTitle}
              maxLength={80}
            />
            <TextInput
              style={styles.noteBodyInput}
              placeholder="Écris ton cours, tes idées, tes formules…"
              placeholderTextColor={Palette.textMuted}
              value={noteBody}
              onChangeText={setNoteBody}
              multiline
              textAlignVertical="top"
            />
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Renommer un fichier */}
      <Modal visible={renameDoc !== null} transparent animationType="fade" onRequestClose={() => setRenameDoc(null)}>
        <Pressable style={styles.backdrop} onPress={() => setRenameDoc(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text variant="heading">Renommer</Text>
              <TextInput
                style={styles.modalInput}
                value={renameValue}
                onChangeText={setRenameValue}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={saveRename}
                maxLength={80}
              />
              <View style={styles.modalActions}>
                <View style={{ flex: 1 }}>
                  <Button label="Annuler" variant="ghost" onPress={() => setRenameDoc(null)} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Enregistrer" onPress={saveRename} disabled={!renameValue.trim()} />
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>

      {/* Déplacer vers un autre chapitre */}
      <Modal visible={moveDoc !== null} transparent animationType="fade" onRequestClose={() => setMoveDoc(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMoveDoc(null)}>
          <Pressable style={[styles.addSheet, { paddingBottom: insets.bottom + Spacing.md }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text variant="heading" style={{ marginBottom: Spacing.sm }}>
              Déplacer vers…
            </Text>
            {moveChapters.map((c, i) => (
              <Tappable
                key={c.id}
                style={[styles.addRow, i === moveChapters.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => doMove(c.id)}
                haptic={false}>
                <View style={[styles.docIcon, { backgroundColor: color + '22' }]}>
                  <Ionicons name="list" size={18} color={color} />
                </View>
                <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                  {c.name}
                </Text>
                <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
              </Tappable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Visionneuse image */}
      <Modal visible={imageUrl !== null} transparent animationType="fade" onRequestClose={() => setImageUrl(null)}>
        <View style={styles.imageViewer}>
          <Tappable
            style={[styles.imageClose, { top: insets.top + Spacing.sm }]}
            onPress={() => setImageUrl(null)}
            accessibilityLabel="Fermer">
            <Ionicons name="close" size={28} color="#fff" />
          </Tappable>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.imageFull} contentFit="contain" />
          ) : null}
        </View>
      </Modal>
    </Screen>
  );
}

function AddRow({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Tappable style={styles.addRow} onPress={onPress} haptic={false}>
      <Ionicons name={icon} size={22} color={Palette.text} />
      <Text variant="bodyStrong" style={{ flex: 1 }}>
        {label}
      </Text>
      <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
    </Tappable>
  );
}

function SegBtn({
  label,
  active,
  color,
  onPress,
}: {
  label: string;
  active: boolean;
  color: string;
  onPress: () => void;
}) {
  return (
    <Tappable
      style={[styles.segBtn, active && { backgroundColor: color + '22' }]}
      onPress={onPress}
      haptic={false}>
      <Text variant="bodyStrong" color={active ? color : Palette.textSecondary}>
        {label}
      </Text>
    </Tappable>
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
  segment: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  segBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    backgroundColor: Palette.surface,
  },
  centerBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  genInput: {
    color: Palette.text,
    ...Type.body,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    minHeight: 120,
    marginVertical: Spacing.sm,
  },
  headerTitle: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot: { width: 12, height: 12, borderRadius: 6 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
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
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  busyCard: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  addSheet: {
    backgroundColor: Palette.surfaceElevated,
    borderTopLeftRadius: Radius.lg,
    borderTopRightRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Palette.border,
    marginBottom: Spacing.sm,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.md + 2,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  // Modales centrées
  sheet: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  modalInput: {
    color: Palette.text,
    ...Type.body,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginVertical: Spacing.sm,
  },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
  // Note plein écran
  noteWrap: { flex: 1, backgroundColor: Palette.background },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  noteTitleInput: {
    color: Palette.text,
    ...Type.title,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  noteBodyInput: {
    flex: 1,
    color: Palette.text,
    ...Type.body,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  // Visionneuse image
  imageViewer: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', alignItems: 'center', justifyContent: 'center' },
  imageClose: { position: 'absolute', right: Spacing.lg, zIndex: 2 },
  imageFull: { width: '100%', height: '80%' },
});
