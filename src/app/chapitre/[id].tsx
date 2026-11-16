import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  createLesson,
  deleteLesson,
  listLessons,
  renameLesson,
  type Lesson,
} from '@/lib/courses';

export default function ChapitreLeconsScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    subjectId?: string;
    name?: string;
    color?: string;
    new?: string;
  }>();
  const chapterId = params.id;
  const subjectId = params.subjectId ?? '';
  const chapterName = params.name ?? 'Chapitre';
  const color = params.color ?? Palette.primary;
  const userId = session?.user?.id;

  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Lesson | null>(null);
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!chapterId) return;
    try {
      setLessons(await listLessons(chapterId));
    } catch {
      // Pas d'invention : liste vide en cas d'échec, l'utilisateur peut réessayer.
    } finally {
      setLoading(false);
    }
  }, [chapterId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setModalOpen(true);
  };

  // Ouverture automatique du formulaire quand on arrive via « Nouvelle leçon ».
  const autoOpened = useRef(false);
  useEffect(() => {
    if (params.new === '1' && !autoOpened.current) {
      autoOpened.current = true;
      openCreate();
    }
  }, [params.new]);

  const openEdit = (l: Lesson) => {
    setEditing(l);
    setTitle(l.title);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) setModalOpen(false);
  };

  const onSave = async () => {
    const trimmed = title.trim();
    if (!trimmed || !userId) return;
    setSaving(true);
    try {
      if (editing) await renameLesson(editing.id, trimmed);
      else await createLesson(userId, subjectId, chapterId, trimmed, lessons.length);
      setModalOpen(false);
      await load();
    } catch {
      Alert.alert('Oups', "La leçon n'a pas pu être enregistrée. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  };

  const onOptions = (l: Lesson) => {
    Alert.alert(l.title, undefined, [
      { text: 'Renommer', onPress: () => openEdit(l) },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Supprimer la leçon', `« ${l.title} » sera supprimée définitivement.`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: async () => {
                setLessons((prev) => prev.filter((x) => x.id !== l.id));
                try {
                  await deleteLesson(l.id);
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

  const openLesson = (l: Lesson) => {
    router.push({
      pathname: '/lecon/[id]',
      params: { id: l.id, name: l.title, color },
    });
  };

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/cours');
  };

  return (
    <Screen>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <View style={styles.headerTitle}>
          <Text variant="small" color={Palette.textMuted}>
            Chapitre
          </Text>
          <Text variant="title" numberOfLines={1}>
            {chapterName}
          </Text>
        </View>
        <Tappable
          style={[styles.addBtn, { backgroundColor: color }]}
          onPress={openCreate}
          accessibilityLabel="Ajouter une leçon">
          <Ionicons name="add" size={24} color="#06130C" />
        </Tappable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color} />
        </View>
      ) : lessons.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          eyebrow="Tes leçons"
          title="Aucune leçon"
          subtitle="Ajoute une leçon pour prendre tes cours : titres, texte, PDF et photos, directement depuis ton téléphone.">
          <Button label="Ajouter une leçon" onPress={openCreate} />
        </EmptyState>
      ) : (
        <FlatList
          data={lessons}
          keyExtractor={(l) => l.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Tappable
              style={styles.row}
              onPress={() => openLesson(item)}
              onLongPress={() => onOptions(item)}
              delayLongPress={300}
              haptic={false}>
              <View style={[styles.rowAccent, { backgroundColor: color }]} />
              <View style={styles.rowIcon}>
                <Ionicons name="document-text-outline" size={20} color={Palette.textSecondary} />
              </View>
              <Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
                {item.title}
              </Text>
              <Pressable hitSlop={10} onPress={() => onOptions(item)} accessibilityLabel="Options">
                <Ionicons name="ellipsis-horizontal" size={20} color={Palette.textMuted} />
              </Pressable>
            </Tappable>
          )}
        />
      )}

      {/* Page : créer / renommer une leçon */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.page}>
          <View style={[styles.pageHeader, { paddingTop: insets.top + Spacing.xs }]}>
            <Tappable onPress={closeModal} hitSlop={12} scaleTo={0.9} accessibilityLabel="Fermer">
              <Ionicons name="close" size={26} color={Palette.text} />
            </Tappable>
            <Text variant="heading">{editing ? 'Renommer la leçon' : 'Nouvelle leçon'}</Text>
            <View style={{ width: 26 }} />
          </View>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.pageBody}>
              <TextInput
                style={styles.input}
                placeholder="Ex. Introduction au cours"
                placeholderTextColor={Palette.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onSave}
                maxLength={120}
              />
            </View>
            <View style={[styles.pageFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
              <Button
                label={editing ? 'Enregistrer' : 'Créer'}
                onPress={onSave}
                loading={saving}
                disabled={!title.trim() || saving}
              />
            </View>
          </KeyboardAvoidingView>
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
  headerTitle: { flex: 1 },
  addBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  list: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    paddingRight: Spacing.md,
    paddingLeft: Spacing.md + 6,
    paddingVertical: Spacing.lg,
    minHeight: 72,
    overflow: 'hidden',
  },
  rowAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  rowIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Palette.surfaceElevated,
  },
  page: { flex: 1, backgroundColor: Palette.background },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Palette.border,
  },
  pageBody: { flex: 1, paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },
  pageFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
  },
  input: {
    color: Palette.text,
    ...Type.body,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginVertical: Spacing.sm,
  },
});
