import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/Text';
import { Palette, Radius, Spacing } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  listSubjectDocuments,
  listSubjects,
  uploadParcoursDocument,
  type DocItem,
  type Subject,
} from '@/lib/courses';
import { comingSoon } from '@/lib/ui';

type DocKind = 'image' | 'pdf';
type SelectedDoc = {
  key: string;
  name: string;
  mime: string | null;
  kind: DocKind;
  storage_path: string;
  source: 'import' | 'cours';
  previewUri?: string;
};

async function normalizeImage(uri: string, width?: number): Promise<string> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    if (width && width > 2000) ctx.resize({ width: 2000 });
    const ref = await ctx.renderAsync();
    const out = await ref.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
    return out.uri;
  } catch {
    return uri;
  }
}

function fileKind(mime: string | undefined | null, name: string | undefined | null): DocKind | null {
  const m = (mime ?? '').toLowerCase();
  const n = (name ?? '').toLowerCase();
  if (m === 'application/pdf' || n.endsWith('.pdf')) return 'pdf';
  if (m.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|heic)$/.test(n)) return 'image';
  return null;
}

export default function NouveauParcoursScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [step, setStep] = useState<1 | 2>(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [subject, setSubject] = useState<Subject | null>(null);
  const [courseDocs, setCourseDocs] = useState<DocItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selected, setSelected] = useState<SelectedDoc[]>([]);
  const [busy, setBusy] = useState(false);

  const loadSubjects = useCallback(async () => {
    if (!userId) {
      setLoadingSubjects(false);
      return;
    }
    try {
      setSubjects(await listSubjects(userId));
    } catch {
      // pas de données inventées
    } finally {
      setLoadingSubjects(false);
    }
  }, [userId]);

  useEffect(() => {
    loadSubjects();
  }, [loadSubjects]);

  const chooseSubject = async (s: Subject) => {
    setSubject(s);
    setStep(2);
    setLoadingDocs(true);
    try {
      setCourseDocs(await listSubjectDocuments(s.id));
    } catch {
      setCourseDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  };

  const addSelected = (d: SelectedDoc) => setSelected((cur) => [...cur, d]);
  const removeSelected = (key: string) => setSelected((cur) => cur.filter((d) => d.key !== key));

  const importImageUris = async (items: { uri: string; name: string; width?: number }[]) => {
    if (!userId) return;
    setBusy(true);
    try {
      for (const it of items) {
        const uri = await normalizeImage(it.uri, it.width);
        const { path } = await uploadParcoursDocument({
          userId,
          kind: 'image',
          uri,
          name: it.name,
          mime: 'image/jpeg',
        });
        addSelected({
          key: path,
          name: it.name,
          mime: 'image/jpeg',
          kind: 'image',
          storage_path: path,
          source: 'import',
          previewUri: uri,
        });
      }
    } catch {
      Alert.alert('Import', "Un fichier n'a pas pu être ajouté. Réessaie.");
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
    await importImageUris([{ uri: a.uri, name: a.fileName ?? 'photo.jpg', width: a.width }]);
  };

  const pickImages = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Photos', "Autorise l'accès à tes photos.");
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ quality: 1, allowsMultipleSelection: true });
    if (res.canceled) return;
    await importImageUris(res.assets.map((a) => ({ uri: a.uri, name: a.fileName ?? 'image.jpg', width: a.width })));
  };

  const pickDocuments = async () => {
    if (!userId) return;
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (res.canceled) return;
    setBusy(true);
    try {
      for (const a of res.assets) {
        const k = fileKind(a.mimeType, a.name);
        if (!k) {
          Alert.alert('Format non pris en charge', `« ${a.name} » : seuls les images et PDF sont acceptés.`);
          continue;
        }
        if (k === 'image') {
          await importImageUris([{ uri: a.uri, name: a.name }]);
          continue;
        }
        const { path } = await uploadParcoursDocument({
          userId,
          kind: 'pdf',
          uri: a.uri,
          name: a.name,
          mime: a.mimeType ?? 'application/pdf',
        });
        addSelected({
          key: path,
          name: a.name,
          mime: a.mimeType ?? 'application/pdf',
          kind: 'pdf',
          storage_path: path,
          source: 'import',
        });
      }
    } catch {
      Alert.alert('Import', "Un document n'a pas pu être ajouté. Réessaie.");
    } finally {
      setBusy(false);
    }
  };

  const importMenu = () => {
    Alert.alert('Ajouter un document', undefined, [
      { text: 'Prendre une photo', onPress: takePhoto },
      { text: 'Importer des images', onPress: pickImages },
      { text: 'Importer un PDF / fichier', onPress: pickDocuments },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const toggleCourseDoc = (d: DocItem) => {
    if (!d.storage_path) return;
    const existing = selected.find((s) => s.storage_path === d.storage_path);
    if (existing) {
      removeSelected(existing.key);
      return;
    }
    addSelected({
      key: d.storage_path,
      name: d.title,
      mime: d.mime,
      kind: d.kind === 'pdf' ? 'pdf' : 'image',
      storage_path: d.storage_path,
      source: 'cours',
    });
  };

  const isPicked = (path: string | null) => !!path && selected.some((s) => s.storage_path === path);

  const goNext = () => {
    // Étapes 3 & 4 (format + difficulté + niveau) : prochaine séance (P3).
    comingSoon('Choix du format, de la difficulté et du niveau');
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.xs }]}>
      {/* En-tête + progression */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (step === 2 ? setStep(1) : router.back())}
          hitSlop={12}
          style={styles.iconBtn}
          accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={22} color={Palette.text} />
        </Pressable>
        <Text variant="bodyStrong">Nouveau parcours</Text>
        <Pressable onPress={() => router.back()} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Fermer">
          <Ionicons name="close" size={22} color={Palette.text} />
        </Pressable>
      </View>
      <View style={styles.steps}>
        {[1, 2, 3, 4].map((n) => (
          <View key={n} style={[styles.stepDot, n <= step ? styles.stepOn : styles.stepOff]} />
        ))}
      </View>

      {step === 1 ? (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}>
          <Text variant="title" style={styles.h1}>
            Choisis la matière
          </Text>
          <Text variant="body" color={Palette.textSecondary} style={styles.sub}>
            Le parcours se basera sur tes documents de cette matière.
          </Text>

          {loadingSubjects ? (
            <ActivityIndicator color={Palette.primary} style={{ marginTop: Spacing.xl }} />
          ) : subjects.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="folder-open-outline" size={40} color={Palette.textMuted} />
              <Text variant="body" color={Palette.textSecondary} center style={{ marginTop: Spacing.md }}>
                Aucune matière pour l'instant. Crée-en une dans « Mes cours » pour démarrer.
              </Text>
              <Pressable
                onPress={() => router.replace('/(tabs)/cours')}
                style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
                <Text variant="bodyStrong" color={Palette.onPrimary}>
                  Aller à Mes cours
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: Spacing.sm }}>
              {subjects.map((s) => (
                <Pressable
                  key={s.id}
                  onPress={() => chooseSubject(s)}
                  style={({ pressed }) => [styles.subjectRow, pressed && styles.pressed]}
                  accessibilityLabel={s.name}>
                  <View style={[styles.subjectDot, { backgroundColor: s.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text variant="bodyStrong" color={Palette.text}>
                      {s.name}
                    </Text>
                    <Text variant="caption" color={Palette.textMuted}>
                      {s.chapter_count ?? 0} chapitre{(s.chapter_count ?? 0) > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
                </Pressable>
              ))}
            </View>
          )}
        </ScrollView>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 120 }]}
            showsVerticalScrollIndicator={false}>
            <Text variant="title" style={styles.h1}>
              Ajoute tes documents
            </Text>
            <Text variant="body" color={Palette.textSecondary} style={styles.sub}>
              {subject?.name} · images ou PDF. L'IA les lira pour créer ton support.
            </Text>

            {/* Import */}
            <Pressable
              onPress={importMenu}
              style={({ pressed }) => [styles.importBtn, pressed && styles.pressed]}
              accessibilityLabel="Importer un document">
              <Ionicons name="add-circle" size={22} color={Palette.primary} />
              <Text variant="bodyStrong" color={Palette.primary}>
                Importer (photo, images, PDF)
              </Text>
            </Pressable>
            {busy ? (
              <View style={styles.busy}>
                <ActivityIndicator color={Palette.primary} />
                <Text variant="caption" color={Palette.textMuted}>
                  Ajout en cours…
                </Text>
              </View>
            ) : null}

            {/* Sélection courante */}
            {selected.length > 0 ? (
              <>
                <Text variant="bodyStrong" color={Palette.textSecondary} style={styles.sectionTitle}>
                  Sélectionnés ({selected.length})
                </Text>
                <View style={{ gap: Spacing.sm }}>
                  {selected.map((d) => (
                    <View key={d.key} style={styles.docRow}>
                      {d.previewUri ? (
                        <Image source={{ uri: d.previewUri }} style={styles.thumb} />
                      ) : (
                        <View style={[styles.docIcon, { backgroundColor: iconColor(d.kind) + '22' }]}>
                          <Ionicons name={d.kind === 'pdf' ? 'document-text' : 'image'} size={18} color={iconColor(d.kind)} />
                        </View>
                      )}
                      <Text variant="body" color={Palette.text} numberOfLines={1} style={{ flex: 1 }}>
                        {d.name}
                      </Text>
                      <Pressable onPress={() => removeSelected(d.key)} hitSlop={10} accessibilityLabel="Retirer">
                        <Ionicons name="close-circle" size={20} color={Palette.textMuted} />
                      </Pressable>
                    </View>
                  ))}
                </View>
              </>
            ) : null}

            {/* Depuis Mes cours */}
            <Text variant="bodyStrong" color={Palette.textSecondary} style={styles.sectionTitle}>
              Depuis Mes cours
            </Text>
            {loadingDocs ? (
              <ActivityIndicator color={Palette.primary} style={{ marginTop: Spacing.sm }} />
            ) : courseDocs.length === 0 ? (
              <Text variant="caption" color={Palette.textMuted}>
                Aucun document enregistré dans cette matière.
              </Text>
            ) : (
              <View style={{ gap: Spacing.sm }}>
                {courseDocs.map((d) => {
                  const picked = isPicked(d.storage_path);
                  return (
                    <Pressable
                      key={d.id}
                      onPress={() => toggleCourseDoc(d)}
                      style={({ pressed }) => [styles.docRow, picked && styles.docRowOn, pressed && styles.pressed]}
                      accessibilityLabel={d.title}>
                      <View style={[styles.docIcon, { backgroundColor: iconColor(d.kind === 'pdf' ? 'pdf' : 'image') + '22' }]}>
                        <Ionicons name={d.kind === 'pdf' ? 'document-text' : 'image'} size={18} color={iconColor(d.kind === 'pdf' ? 'pdf' : 'image')} />
                      </View>
                      <Text variant="body" color={Palette.text} numberOfLines={1} style={{ flex: 1 }}>
                        {d.title}
                      </Text>
                      <Ionicons
                        name={picked ? 'checkmark-circle' : 'ellipse-outline'}
                        size={20}
                        color={picked ? Palette.primary : Palette.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Pied : continuer */}
          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Pressable
              onPress={goNext}
              disabled={selected.length === 0}
              style={({ pressed }) => [
                styles.cta,
                selected.length === 0 && styles.ctaOff,
                pressed && styles.pressed,
              ]}>
              <Text variant="bodyStrong" color={selected.length === 0 ? Palette.textMuted : Palette.onPrimary}>
                {selected.length === 0 ? 'Ajoute au moins 1 document' : `Continuer (${selected.length})`}
              </Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

function iconColor(kind: DocKind): string {
  return kind === 'pdf' ? '#FF5A5F' : '#5B8CFF';
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Palette.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surface,
  },
  steps: { flexDirection: 'row', gap: 6, paddingHorizontal: Spacing.lg, paddingBottom: Spacing.md },
  stepDot: { flex: 1, height: 4, borderRadius: Radius.pill },
  stepOn: { backgroundColor: Palette.primary },
  stepOff: { backgroundColor: Palette.border },
  body: { paddingHorizontal: Spacing.lg },
  h1: { marginTop: Spacing.sm },
  sub: { marginTop: 4, marginBottom: Spacing.lg },
  sectionTitle: { marginTop: Spacing.lg, marginBottom: Spacing.sm },
  empty: { alignItems: 'center', marginTop: Spacing.xxl, paddingHorizontal: Spacing.lg },
  subjectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  subjectDot: { width: 14, height: 14, borderRadius: Radius.pill },
  importBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Palette.primary + '55',
  },
  busy: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  docRowOn: { borderWidth: 1, borderColor: Palette.primary },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: { width: 36, height: 36, borderRadius: Radius.sm, backgroundColor: Palette.border },
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
    marginTop: Spacing.lg,
  },
  ctaOff: { backgroundColor: Palette.surface },
  pressed: { opacity: 0.6 },
});
