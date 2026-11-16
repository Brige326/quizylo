import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
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
import { TopBar } from '@/components/TopBar';
import { Palette, Radius, Spacing, Type } from '@/constants/theme';
import { useAuth } from '@/contexts/auth';
import {
  createSubject,
  deleteSubject,
  listSubjects,
  renameSubject,
  updateSubjectColor,
  SUBJECT_COLORS,
  type Subject,
} from '@/lib/courses';

export default function MesCoursScreen() {
  const { session, isGuest, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  // Modale de création / renommage.
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState(SUBJECT_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    try {
      const list = await listSubjects(userId);
      setSubjects(list);
    } catch {
      // On n'invente rien : en cas d'échec réseau, la liste reste vide et l'utilisateur peut réessayer.
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setName('');
    setColor(SUBJECT_COLORS[0]);
    setModalOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setName(s.name);
    setColor(s.color);
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
  };

  const onSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || !userId) return;
    setSaving(true);
    try {
      if (editing) {
        if (trimmed !== editing.name) await renameSubject(editing.id, trimmed);
        if (color !== editing.color) await updateSubjectColor(editing.id, color);
      } else {
        await createSubject(userId, trimmed, color, subjects.length);
      }
      setModalOpen(false);
      await load();
    } catch {
      Alert.alert('Oups', "La matière n'a pas pu être enregistrée. Réessaie dans un instant.");
    } finally {
      setSaving(false);
    }
  };

  const onOptions = (s: Subject) => {
    Alert.alert(s.name, undefined, [
      { text: 'Renommer', onPress: () => openEdit(s) },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: () =>
          Alert.alert(
            'Supprimer la matière',
            `« ${s.name} » et son contenu seront supprimés définitivement.`,
            [
              { text: 'Annuler', style: 'cancel' },
              {
                text: 'Supprimer',
                style: 'destructive',
                onPress: async () => {
                  setSubjects((prev) => prev.filter((x) => x.id !== s.id)); // retrait immédiat
                  try {
                    await deleteSubject(s.id);
                  } catch {
                    load(); // on resynchronise si la suppression a échoué
                  }
                },
              },
            ],
          ),
      },
      { text: 'Annuler', style: 'cancel' },
    ]);
  };

  // Invité : pas de bibliothèque personnelle sans compte.
  if (isGuest || !userId) {
    return (
      <Screen>
        <TopBar />
        <EmptyState
          icon="library-outline"
          eyebrow="Ta bibliothèque"
          title="Ta bibliothèque de cours"
          subtitle="Connecte-toi pour créer tes matières, importer tes documents et réviser où que tu sois.">
          <Button
            label="Se connecter"
            onPress={() => {
              exitGuest();
              router.replace('/(auth)/login');
            }}
          />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen>
      <TopBar />

      {!loading && subjects.length > 0 ? (
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text variant="title">Mes cours</Text>
            <Text variant="small" color={Palette.textSecondary}>
              {`${subjects.length} matière${subjects.length > 1 ? 's' : ''}`}
            </Text>
          </View>
          <Tappable
            style={styles.searchBtn}
            onPress={() => router.push('/recherche-cours')}
            accessibilityLabel="Rechercher">
            <Ionicons name="search" size={22} color={Palette.text} />
          </Tappable>
          <Tappable style={styles.addBtn} onPress={openCreate} accessibilityLabel="Ajouter une matière">
            <Ionicons name="add" size={26} color={Palette.onPrimary} />
          </Tappable>
        </View>
      ) : null}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
        </View>
      ) : subjects.length === 0 ? (
        <EmptyState
          icon="library-outline"
          eyebrow="Ta bibliothèque"
          title="Ta bibliothèque de cours"
          subtitle="Crée ta première matière pour organiser tes cours, tes documents et tes révisions.">
          <Button label="Ajouter une matière" onPress={openCreate} />
        </EmptyState>
      ) : (
        <FlatList
          data={subjects}
          keyExtractor={(s) => s.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <SubjectCard
              subject={item}
              onOpen={() =>
                router.push({
                  pathname: '/matiere/[id]',
                  params: { id: item.id, name: item.name, color: item.color },
                })
              }
              onOptions={() => onOptions(item)}
            />
          )}
        />
      )}

      {/* Page : création / renommage d'une matière */}
      <Modal visible={modalOpen} animationType="slide" onRequestClose={closeModal}>
        <View style={styles.page}>
          <View style={[styles.pageHeader, { paddingTop: insets.top + Spacing.xs }]}>
            <Tappable onPress={closeModal} hitSlop={12} scaleTo={0.9} accessibilityLabel="Fermer">
              <Ionicons name="close" size={26} color={Palette.text} />
            </Tappable>
            <Text variant="heading">{editing ? 'Renommer la matière' : 'Nouvelle matière'}</Text>
            <View style={{ width: 26 }} />
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <View style={styles.pageBody}>
              <TextInput
                style={styles.modalInput}
                placeholder="Ex. Mathématiques"
                placeholderTextColor={Palette.textMuted}
                value={name}
                onChangeText={setName}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={onSave}
                maxLength={60}
              />

              <Text variant="small" color={Palette.textSecondary} style={{ marginBottom: Spacing.xs, marginTop: Spacing.md }}>
                Couleur
              </Text>
              <View style={styles.colorRow}>
                {SUBJECT_COLORS.map((c) => (
                  <Tappable
                    key={c}
                    onPress={() => setColor(c)}
                    scaleTo={0.85}
                    accessibilityLabel={`Couleur ${c}`}>
                    <View
                      style={[
                        styles.colorDot,
                        { backgroundColor: c },
                        color === c && styles.colorDotActive,
                      ]}>
                      {color === c ? <Ionicons name="checkmark" size={16} color="#06130C" /> : null}
                    </View>
                  </Tappable>
                ))}
              </View>
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

function SubjectCard({
  subject,
  onOpen,
  onOptions,
}: {
  subject: Subject;
  onOpen: () => void;
  onOptions: () => void;
}) {
  return (
    <Tappable style={styles.card} onPress={onOpen} haptic={false}>
      <View style={styles.cardTop}>
        <View style={[styles.cardIcon, { backgroundColor: subject.color + '22' }]}>
          <Ionicons name="book" size={22} color={subject.color} />
        </View>
        <Pressable hitSlop={10} onPress={onOptions} accessibilityLabel="Options">
          <Ionicons name="ellipsis-horizontal" size={20} color={Palette.textMuted} />
        </Pressable>
      </View>
      <Text variant="bodyStrong" numberOfLines={2} style={styles.cardName}>
        {subject.name}
      </Text>
      <View style={[styles.cardBar, { backgroundColor: subject.color }]} />
    </Tappable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.md,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
  },
  input: { flex: 1, color: Palette.text, ...Type.body },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.md },
  gridRow: { gap: Spacing.md },
  card: {
    flex: 1,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    height: 134,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardName: { marginTop: Spacing.sm },
  cardBar: { height: 4, borderRadius: 2, marginTop: Spacing.md },
  // Page plein écran
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
  // Modale
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
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.md },
  colorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorDotActive: { borderColor: Palette.text },
  modalActions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xs },
});
