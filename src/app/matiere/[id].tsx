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
          <View style={[styles.dot, { backgroundColor: color }]} />
          <Text variant="heading" numberOfLines={1} style={{ flex: 1 }}>
            {subjectName}
          </Text>
        </View>
        <Tappable
          style={[styles.addBtn, { backgroundColor: color }]}
          onPress={openCreate}
          accessibilityLabel="Ajouter un chapitre">
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
          renderItem={({ item, index }) => (
            <Tappable
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/chapitre/[id]',
                  params: { id: item.id, subjectId, name: item.name, color },
                })
              }
              haptic={false}>
              <View style={[styles.index, { backgroundColor: color + '22' }]}>
                <Text variant="bodyStrong" color={color}>
                  {index + 1}
                </Text>
              </View>
              <Text variant="bodyStrong" numberOfLines={2} style={{ flex: 1 }}>
                {item.name}
              </Text>
              <Pressable hitSlop={10} onPress={() => onOptions(item)} accessibilityLabel="Options">
                <Ionicons name="ellipsis-horizontal" size={20} color={Palette.textMuted} />
              </Pressable>
            </Tappable>
          )}
        />
      )}

      {/* Modale créer / renommer un chapitre */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={closeModal}>
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text variant="heading">{editing ? 'Renommer le chapitre' : 'Nouveau chapitre'}</Text>
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
              <View style={styles.modalActions}>
                <View style={{ flex: 1 }}>
                  <Button label="Annuler" variant="ghost" onPress={closeModal} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    label={editing ? 'Enregistrer' : 'Créer'}
                    onPress={onSave}
                    loading={saving}
                    disabled={!name.trim() || saving}
                  />
                </View>
              </View>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
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
  index: {
    width: 36,
    height: 36,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
