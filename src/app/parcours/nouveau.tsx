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
  generateFromDocuments,
  listSubjectDocuments,
  listSubjects,
  saveGeneratedContent,
  uploadParcoursDocument,
  type Difficulty,
  type DocItem,
  type GenKind,
  type Level,
  type Subject,
} from '@/lib/courses';

type DocKind = 'image' | 'pdf';

type Format = { key: GenKind; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; desc: string };
const FORMATS: Format[] = [
  { key: 'quiz', label: 'Quiz', icon: 'help-circle', color: '#5B8CFF', desc: 'Des questions à choix multiples, corrigées et expliquées.' },
  { key: 'fiche', label: 'Fiche de révision', icon: 'document-text', color: '#22E07B', desc: 'Les points clés organisés en sections claires.' },
  { key: 'resume', label: 'Résumé', icon: 'reader', color: '#A855F7', desc: 'Une synthèse fidèle de tes documents.' },
];

const DIFFICULTIES: { key: Difficulty; label: string }[] = [
  { key: 'facile', label: 'Facile' },
  { key: 'moyen', label: 'Moyen' },
  { key: 'difficile', label: 'Difficile' },
];

const LEVELS: { key: Level; label: string }[] = [
  { key: 'college', label: 'Collège' },
  { key: 'lycee', label: 'Lycée' },
  { key: 'superieur', label: 'Supérieur' },
];

function friendlyError(code?: string): string {
  switch (code) {
    case 'no_source':
      return 'Aucun document exploitable. Ajoute une image ou un PDF.';
    case 'bad_key':
      return "La clé de l'IA semble invalide. Vérifie la configuration.";
    case 'rate_limited':
      return 'Trop de demandes d’un coup. Patiente quelques secondes et réessaie.';
    case 'parse_failed':
      return "L'IA a renvoyé un format inattendu. Réessaie.";
    default:
      return "La génération a échoué. Réessaie dans un instant.";
  }
}
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

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);

  const [subject, setSubject] = useState<Subject | null>(null);
  const [courseDocs, setCourseDocs] = useState<DocItem[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [selected, setSelected] = useState<SelectedDoc[]>([]);
  const [busy, setBusy] = useState(false);

  const [kind, setKind] = useState<GenKind | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('moyen');
  const [level, setLevel] = useState<Level>('lycee');
  const [generating, setGenerating] = useState(false);

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

  const goNext = () => setStep(3);

  const back = () => {
    if (step > 1) setStep((step - 1) as 1 | 2 | 3);
    else router.back();
  };

  const generate = async () => {
    if (!userId || !subject || !kind || selected.length === 0 || generating) return;
    setGenerating(true);
    try {
      const res = await generateFromDocuments({
        kind,
        difficulty,
        level,
        subjectLabel: subject.name,
        attachments: selected.map((s) => ({ storage_path: s.storage_path, mime: s.mime, name: s.name })),
      });
      if (!res.configured) {
        Alert.alert('IA non configurée', "L'assistant IA n'est pas encore activé sur ce projet.");
        return;
      }
      if (res.error || !res.payload) {
        Alert.alert('Génération', friendlyError(res.error));
        return;
      }
      const title = `${subject.name} · ${res.title ?? FORMATS.find((f) => f.key === kind)?.label ?? 'Révision'}`;
      const item = await saveGeneratedContent({
        userId,
        subjectId: subject.id,
        kind,
        title,
        payload: res.payload,
        difficulty,
        level,
        summary: res.summary ?? null,
      });
      router.replace(`/revision/${item.id}`);
    } catch {
      Alert.alert('Génération', "La génération a échoué. Vérifie ta connexion et réessaie.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + Spacing.xs }]}>
      {/* En-tête + progression */}
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} style={styles.iconBtn} accessibilityLabel="Retour">
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
      ) : step === 2 ? (
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
      ) : step === 3 ? (
        <ScrollView
          contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + Spacing.xl }]}
          showsVerticalScrollIndicator={false}>
          <Text variant="title" style={styles.h1}>
            Choisis le format
          </Text>
          <Text variant="body" color={Palette.textSecondary} style={styles.sub}>
            Que veux-tu générer à partir de tes documents ?
          </Text>
          <View style={{ gap: Spacing.sm }}>
            {FORMATS.map((f) => (
              <Pressable
                key={f.key}
                onPress={() => {
                  setKind(f.key);
                  setStep(4);
                }}
                style={({ pressed }) => [styles.formatCard, pressed && styles.pressed]}
                accessibilityLabel={f.label}>
                <View style={[styles.formatIcon, { backgroundColor: f.color + '22' }]}>
                  <Ionicons name={f.icon} size={22} color={f.color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" color={Palette.text}>
                    {f.label}
                  </Text>
                  <Text variant="caption" color={Palette.textMuted}>
                    {f.desc}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      ) : (
        <>
          <ScrollView
            contentContainerStyle={[styles.body, { paddingBottom: 120 }]}
            showsVerticalScrollIndicator={false}>
            <Text variant="title" style={styles.h1}>
              Difficulté & niveau
            </Text>
            <Text variant="body" color={Palette.textSecondary} style={styles.sub}>
              {FORMATS.find((f) => f.key === kind)?.label} · le contenu s'adapte à ton niveau.
            </Text>

            <Text variant="bodyStrong" color={Palette.textSecondary} style={styles.sectionTitle}>
              Difficulté
            </Text>
            <View style={styles.segment}>
              {DIFFICULTIES.map((d) => {
                const on = difficulty === d.key;
                return (
                  <Pressable
                    key={d.key}
                    onPress={() => setDifficulty(d.key)}
                    style={[styles.segItem, on && styles.segOn]}
                    accessibilityLabel={d.label}>
                    <Text variant="bodyStrong" color={on ? Palette.onPrimary : Palette.textSecondary}>
                      {d.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text variant="bodyStrong" color={Palette.textSecondary} style={styles.sectionTitle}>
              Niveau
            </Text>
            <View style={styles.segment}>
              {LEVELS.map((l) => {
                const on = level === l.key;
                return (
                  <Pressable
                    key={l.key}
                    onPress={() => setLevel(l.key)}
                    style={[styles.segItem, on && styles.segOn]}
                    accessibilityLabel={l.label}>
                    <Text variant="bodyStrong" color={on ? Palette.onPrimary : Palette.textSecondary}>
                      {l.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
            <Pressable
              onPress={generate}
              disabled={generating}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}>
              <Text variant="bodyStrong" color={Palette.onPrimary}>
                Générer mon support
              </Text>
            </Pressable>
          </View>
        </>
      )}

      {generating ? (
        <View style={styles.overlay}>
          <ActivityIndicator color={Palette.primary} size="large" />
          <Text variant="bodyStrong" color={Palette.text} center style={{ marginTop: Spacing.md }}>
            Génération en cours…
          </Text>
          <Text variant="caption" color={Palette.textMuted} center style={{ marginTop: 4 }}>
            L'IA lit tes documents et prépare ton support.
          </Text>
        </View>
      ) : null}
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
  formatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  formatIcon: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segment: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  segItem: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  segOn: { backgroundColor: Palette.primary },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Palette.background + 'F2',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
});
