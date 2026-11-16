import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  createChapter,
  deleteChapter,
  listChapters,
  renameChapter,
  type Chapter,
} from '@/lib/courses';

export default function MatiereDetailScreen() {
  const { session } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; name?: string; color?: string }>();
  const subjectId = params.id;
  const subjectName = params.name ?? 'Matière';
  const color = params.color ?? Palette.primary;
  const userId = session?.user?.id;

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Chapter | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!subjectId) return;
    try {
      setChapters(await listChapters(subjectId));
    } catch {
      // Pas d'invention : liste vide en cas d'échec, l'utilisateur peut réessayer.
    } finally {
      setLoading(false);
    }
  }, [subjectId]);

  useEffect(() => {
    load();
  }, [load]);

  const back = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/cours');
  };

  const openCreate = () => {
    setEditing(null);
    setName('');
    setModalOpen(true);
  };

  const goNewLesson = (chapter: Chapter) => {
    router.push({
      pathname: '/chapitre/[id]',
      params: { id: chapter.id, subjectId, name: chapter.name, color, new: '1' },
    });
  };

  const onNewLesson = () => {
    if (chapters.length === 0) {
      Alert.alert(
        'Nouvelle leçon',
        "Crée d’abord un chapitre : tu pourras ensuite y ajouter des leçons.",
        [
          { text: 'Créer un chapitre', onPress: openCreate },
          { text: 'Annuler', style: 'cancel' },
        ],
      );
      return;
    }
    if (chapters.length === 1) {
      goNewLesson(chapters[0]);
      return;
    }
    Alert.alert('Dans quel chapitre ?', undefined, [
      ...chapters.map((c) => ({ text: c.name, onPress: () => goNewLesson(c) })),
      { text: 'Annuler', style: 'cancel' as const },
    ]);
  };

  const onAdd = () => {
    Alert.alert('Ajouter', undefined, [
      { text: 'Nouveau chapitre', onPress: openCreate },
      { text: 'Nouvelle leçon', onPress: onNewLesson },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  const openEdit = (c: Chapter) => {
    setEditing(c);
    setName(c.name);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (!saving) setModalOpen(false);
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || !userId) return;
    setSaving(true);
    try {
      if (editing) await renameChapter(editing.id, trimmed);
      else await createChapter(userId, subjectId, trimmed, chapters.length);
      setModalOpen(false);
      await load();
    } catch {
      Alert.alert('Oups', "Le chapitre n'a pas pu être enregistré. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  };

  const onOptions = (c: Chapter) => {
    Alert.alert(c.name, undefined, [
      { text: 'Renommer', onPress: () => openEdit(c) },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Supprimer le chapitre', `« ${c.name} » sera supprimé définitivement.`, [
            { text: 'Annuler', style: 'cancel' },
            {
              text: 'Supprimer',
              style: 'destructive',
              onPress: async () => {
                setChapters((prev) => prev.filter((x) => x.id !== c.id));
                try {
                  await deleteChapter(c.id);
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

  return (
    <Screen>
      {/* En-tête */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.xs }]}>
        <Tappable onPress={back} hitSlop={12} scaleTo={0.9} accessibilityLabel="Retour">
          <Ionicons name="chevron-back" size={26} color={Palette.text} />
        </Tappable>
        <View style={styles.headerTitle}>
          <Text variant="title" numberOfLines={1}>
            {subjectName}
          </Text>
          {!loading && chapters.length > 0 ? (
            <Text variant="small" color={Palette.textSecondary}>
              Les chapitres de cette matière
            </Text>
          ) : null}
        </View>
        <Tappable
          style={[styles.addBtn, { backgroundColor: color }]}
          onPress={onAdd}
          accessibilityLabel="Ajouter">
          <Ionicons name="add" size={24} color="#06130C" />
        </Tappable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={color} />
        </View>
      ) : chapters.length === 0 ? (
        <EmptyState
          icon="list-outline"
          eyebrow="Tes chapitres"
          title="Aucun chapitre"
          subtitle="Découpe cette matière en chapitres pour organiser tes cours et tes révisions.">
          <Button label="Ajouter un chapitre" onPress={openCreate} />
        </EmptyState>
      ) : (
        <FlatList
          data={chapters}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <Tappable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/chapitre/[id]',
                  params: { id: item.id, subjectId, name: item.name, color },
                })
              }
              onLongPress={() => onOptions(item)}
              delayLongPress={300}
              haptic={false}>
              <Text variant="heading" numberOfLines={2} style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Pressable hitSlop={10} onPress={() => onOptions(item)} accessibilityLabel="Options">
                <Ionicons name="ellipsis-horizontal" size={20} color={Palette.textMuted} />
              </Pressable>
            </Tappable>
          )}
        />
      )}

      {/* Page : créer / renommer un chapitre */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.page}>
          <View style={[styles.pageHeader, { paddingTop: insets.top + Spacing.xs }]}>
            <Tappable onPress={closeModal} hitSlop={12} scaleTo={0.9} accessibilityLabel="Fermer">
              <Ionicons name="close" size={26} color={Palette.text} />
            </Tappable>
            <Text variant="heading">{editing ? 'Renommer le chapitre' : 'Nouveau chapitre'}</Text>
            <View style={{ width: 26 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.pageBody}>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex. Les probabilités"
                placeholderTextColor={Palette.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onSave}
                maxLength={80}
              />
            </View>
            <View style={[styles.pageFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
              <Button
                label={editing ? 'Enregistrer' : 'Créer'}
                onPress={onSave}
                loading={saving}
                disabled={!name.trim() || saving}
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
  headerTitle: { flex: 1, gap: 2 },
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
    paddingVertical: Spacing.lg,
    minHeight: 76,
    overflow: 'hidden',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  sheet: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
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
});
