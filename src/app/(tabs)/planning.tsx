import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Switch,
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
  CATEGORIES,
  categoryOf,
  createEvent,
  deleteEvent,
  listEventsBetween,
  type EventItem,
} from '@/lib/planning';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmtDay(d: Date): string {
  return cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
function nextHour(): Date {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  return d;
}

export default function PlanningScreen() {
  const { session, isGuest, exitGuest } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const userId = session?.user?.id;

  const [day, setDay] = useState<Date>(() => startOfDay(new Date()));
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Formulaire d'ajout
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [allDay, setAllDay] = useState(false);
  const [time, setTime] = useState<Date>(nextHour);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const isToday = useMemo(() => sameDay(day, new Date()), [day]);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const start = startOfDay(day);
    const end = addDays(start, 1);
    try {
      setEvents(await listEventsBetween(userId, start.toISOString(), end.toISOString()));
    } catch {
      // rien d'inventé
    } finally {
      setLoading(false);
    }
  }, [userId, day]);

  useEffect(() => {
    load();
  }, [load]);

  const closeAdd = () => {
    if (!saving) setAddOpen(false);
  };

  const openAdd = () => {
    setTitle('');
    setCategory(CATEGORIES[0].key);
    setAllDay(false);
    setTime(nextHour());
    setShowPicker(false);
    setAddOpen(true);
  };

  const save = async () => {
    if (!title.trim() || !userId) return;
    setSaving(true);
    const start = startOfDay(day);
    if (!allDay) start.setHours(time.getHours(), time.getMinutes(), 0, 0);
    try {
      await createEvent({
        userId,
        title,
        category,
        startsAt: start.toISOString(),
        allDay,
      });
      setAddOpen(false);
      await load();
    } catch {
      Alert.alert('Oups', "L'événement n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };

  const onEventPress = (e: EventItem) => {
    Alert.alert(e.title, undefined, [
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setEvents((prev) => prev.filter((x) => x.id !== e.id));
          try {
            await deleteEvent(e.id);
          } catch {
            load();
          }
        },
      },
      { text: 'Fermer', style: 'cancel' },
    ]);
  };

  if (isGuest || !userId) {
    return (
      <Screen>
        <TopBar />
        <EmptyState
          icon="calendar-outline"
          title="Ton agenda personnel"
          subtitle="Connecte-toi pour organiser tes cours, tes révisions et tout ton quotidien.">
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
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text variant="title">Planning</Text>
          <Text variant="small" color={Palette.textSecondary}>
            {isToday ? "Aujourd'hui" : fmtDay(day)}
          </Text>
        </View>
        <Tappable style={styles.addBtn} onPress={openAdd} accessibilityLabel="Ajouter une activité">
          <Ionicons name="add" size={26} color={Palette.onPrimary} />
        </Tappable>
      </View>

      {/* Navigation de date */}
      <View style={styles.dateBar}>
        <Tappable style={styles.navArrow} onPress={() => setDay((d) => addDays(d, -1))} accessibilityLabel="Jour précédent">
          <Ionicons name="chevron-back" size={22} color={Palette.text} />
        </Tappable>
        <View style={styles.dateCenter}>
          <Text variant="bodyStrong">{fmtDay(day)}</Text>
          {!isToday ? (
            <Tappable onPress={() => setDay(startOfDay(new Date()))} hitSlop={8}>
              <Text variant="small" color={Palette.primary}>
                Aujourd'hui
              </Text>
            </Tappable>
          ) : null}
        </View>
        <Tappable style={styles.navArrow} onPress={() => setDay((d) => addDays(d, 1))} accessibilityLabel="Jour suivant">
          <Ionicons name="chevron-forward" size={22} color={Palette.text} />
        </Tappable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
        </View>
      ) : events.length === 0 ? (
        <EmptyState
          icon="sunny-outline"
          title="Journée libre"
          subtitle="Rien de prévu ce jour. Ajoute une activité pour organiser ta journée.">
          <Button label="Ajouter une activité" onPress={openAdd} />
        </EmptyState>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(e) => e.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const cat = categoryOf(item.category);
            return (
              <Tappable style={styles.eventRow} onPress={() => onEventPress(item)} haptic={false}>
                <View style={styles.timeCol}>
                  <Text variant="small" color={Palette.textSecondary}>
                    {item.all_day ? 'Journée' : fmtTime(item.starts_at)}
                  </Text>
                </View>
                <View style={[styles.catBar, { backgroundColor: cat.color }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text variant="small" color={Palette.textMuted}>
                    {cat.label}
                  </Text>
                </View>
              </Tappable>
            );
          }}
        />
      )}

      {/* Modale d'ajout */}
      <Modal visible={addOpen} transparent animationType="fade" onRequestClose={closeAdd}>
        <Pressable style={styles.backdrop} onPress={closeAdd}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text variant="heading">Nouvelle activité</Text>

              <TextInput
                style={styles.input}
                placeholder="Titre (ex. Réviser les probabilités)"
                placeholderTextColor={Palette.textMuted}
                value={title}
                onChangeText={setTitle}
                autoFocus
                maxLength={80}
              />

              <View style={styles.rowBetween}>
                <Text variant="bodyStrong">Toute la journée</Text>
                <Switch
                  value={allDay}
                  onValueChange={setAllDay}
                  trackColor={{ true: Palette.primary, false: Palette.border }}
                  thumbColor="#fff"
                />
              </View>

              {!allDay ? (
                <Tappable style={styles.rowBetween} onPress={() => setShowPicker((s) => !s)} haptic={false}>
                  <Text variant="bodyStrong">Heure</Text>
                  <Text variant="bodyStrong" color={Palette.primary}>
                    {time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </Tappable>
              ) : null}

              {!allDay && showPicker ? (
                <DateTimePicker
                  value={time}
                  mode="time"
                  is24Hour
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_e, d) => {
                    if (Platform.OS !== 'ios') setShowPicker(false);
                    if (d) setTime(d);
                  }}
                />
              ) : null}

              <Text variant="small" color={Palette.textSecondary} style={{ marginTop: Spacing.sm }}>
                Catégorie
              </Text>
              <View style={styles.catRow}>
                {CATEGORIES.map((c) => {
                  const active = c.key === category;
                  return (
                    <Tappable
                      key={c.key}
                      style={[styles.catChip, active && { backgroundColor: c.color + '33', borderColor: c.color }]}
                      onPress={() => setCategory(c.key)}
                      haptic={false}>
                      <View style={[styles.catDot, { backgroundColor: c.color }]} />
                      <Text variant="small" color={active ? Palette.text : Palette.textSecondary}>
                        {c.label}
                      </Text>
                    </Tappable>
                  );
                })}
              </View>

              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <Button label="Annuler" variant="ghost" onPress={closeAdd} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Créer" onPress={save} loading={saving} disabled={!title.trim() || saving} />
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
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  navArrow: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Palette.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCenter: { alignItems: 'center', gap: 2 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl },
  list: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl, gap: Spacing.sm },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  timeCol: { width: 52 },
  catBar: { width: 4, alignSelf: 'stretch', borderRadius: 2 },
  // Modale
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' },
  sheet: {
    backgroundColor: Palette.surfaceElevated,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.sm,
    marginHorizontal: Spacing.lg,
  },
  input: {
    color: Palette.text,
    ...Type.body,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: Palette.surface,
  },
  catDot: { width: 10, height: 10, borderRadius: 5 },
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.md },
});
