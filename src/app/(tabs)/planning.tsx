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
  ScrollView,
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
  updateEvent,
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
function combine(date: Date, time: Date): Date {
  const d = new Date(date);
  d.setHours(time.getHours(), time.getMinutes(), 0, 0);
  return d;
}
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fmtDay(d: Date): string {
  return cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }));
}
function fmtDateShort(d: Date): string {
  return cap(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
}
function fmtTime(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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

  // Formulaire (création + modification)
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<EventItem | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].key);
  const [description, setDescription] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [formDate, setFormDate] = useState<Date>(() => startOfDay(new Date()));
  const [startTime, setStartTime] = useState<Date>(nextHour);
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showDate, setShowDate] = useState(false);
  const [showStart, setShowStart] = useState(false);
  const [showEnd, setShowEnd] = useState(false);
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

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setShowDate(false);
    setShowStart(false);
    setShowEnd(false);
  };

  const openAdd = () => {
    setEditing(null);
    setTitle('');
    setCategory(CATEGORIES[0].key);
    setDescription('');
    setAllDay(false);
    setFormDate(startOfDay(day));
    setStartTime(nextHour());
    setEndTime(null);
    setShowDate(false);
    setShowStart(false);
    setShowEnd(false);
    setFormOpen(true);
  };

  const openEdit = (e: EventItem) => {
    const s = new Date(e.starts_at);
    setEditing(e);
    setTitle(e.title);
    setCategory(e.category);
    setDescription(e.description ?? '');
    setAllDay(e.all_day);
    setFormDate(startOfDay(s));
    setStartTime(s);
    setEndTime(e.ends_at ? new Date(e.ends_at) : null);
    setShowDate(false);
    setShowStart(false);
    setShowEnd(false);
    setFormOpen(true);
  };

  const save = async () => {
    if (!title.trim() || !userId) return;
    const start = allDay ? startOfDay(formDate) : combine(formDate, startTime);
    let endISO: string | null = null;
    if (!allDay && endTime) {
      const end = combine(formDate, endTime);
      if (end.getTime() <= start.getTime()) {
        Alert.alert('Heure de fin', "L'heure de fin doit être après l'heure de début.");
        return;
      }
      endISO = end.toISOString();
    }
    setSaving(true);
    const payload = {
      title,
      category,
      startsAt: start.toISOString(),
      endsAt: endISO,
      allDay,
      description: description.trim() || null,
    };
    try {
      if (editing) await updateEvent(editing.id, payload);
      else await createEvent({ userId, ...payload });
      setFormOpen(false);
      if (sameDay(formDate, day)) await load();
      else setDay(startOfDay(formDate)); // on bascule sur le jour de l'événement
    } catch {
      Alert.alert('Oups', "L'événement n'a pas pu être enregistré.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    const e = editing;
    if (!e) return;
    Alert.alert('Supprimer', `« ${e.title} » sera supprimé définitivement.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setFormOpen(false);
          setEvents((prev) => prev.filter((x) => x.id !== e.id));
          try {
            await deleteEvent(e.id);
          } catch {
            load();
          }
        },
      },
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
              <Tappable style={styles.eventRow} onPress={() => openEdit(item)} haptic={false}>
                <View style={styles.timeCol}>
                  {item.all_day ? (
                    <Text variant="small" color={Palette.textSecondary}>
                      Journée
                    </Text>
                  ) : (
                    <>
                      <Text variant="small" color={Palette.text}>
                        {fmtTime(item.starts_at)}
                      </Text>
                      {item.ends_at ? (
                        <Text variant="small" color={Palette.textMuted}>
                          {fmtTime(item.ends_at)}
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>
                <View style={[styles.catBar, { backgroundColor: cat.color }]} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong" numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text variant="small" color={Palette.textMuted}>
                    {cat.label}
                    {item.description ? ' · …' : ''}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
              </Tappable>
            );
          }}
        />
      )}

      {/* Modale création / modification */}
      <Modal visible={formOpen} transparent animationType="fade" onRequestClose={closeForm}>
        <Pressable style={styles.backdrop} onPress={closeForm}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                <View style={styles.sheetHead}>
                  <Text variant="heading">{editing ? "Modifier l'activité" : 'Nouvelle activité'}</Text>
                  {editing ? (
                    <Tappable onPress={onDelete} hitSlop={10} accessibilityLabel="Supprimer">
                      <Ionicons name="trash-outline" size={22} color={Palette.danger} />
                    </Tappable>
                  ) : null}
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Titre (ex. Réviser les probabilités)"
                  placeholderTextColor={Palette.textMuted}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={80}
                />

                <Row label="Date">
                  <Tappable onPress={() => setShowDate((s) => !s)} hitSlop={6}>
                    <Text variant="bodyStrong" color={Palette.primary}>
                      {fmtDateShort(formDate)}
                    </Text>
                  </Tappable>
                </Row>
                {showDate ? (
                  <DateTimePicker
                    value={formDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(_e, d) => {
                      if (Platform.OS !== 'ios') setShowDate(false);
                      if (d) setFormDate(startOfDay(d));
                    }}
                  />
                ) : null}

                <Row label="Toute la journée">
                  <Switch
                    value={allDay}
                    onValueChange={setAllDay}
                    trackColor={{ true: Palette.primary, false: Palette.border }}
                    thumbColor="#fff"
                  />
                </Row>

                {!allDay ? (
                  <>
                    <Row label="Début">
                      <Tappable onPress={() => setShowStart((s) => !s)} hitSlop={6}>
                        <Text variant="bodyStrong" color={Palette.primary}>
                          {fmtTime(startTime)}
                        </Text>
                      </Tappable>
                    </Row>
                    {showStart ? (
                      <DateTimePicker
                        value={startTime}
                        mode="time"
                        is24Hour
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_e, d) => {
                          if (Platform.OS !== 'ios') setShowStart(false);
                          if (d) setStartTime(d);
                        }}
                      />
                    ) : null}

                    <Row label="Fin">
                      {endTime ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
                          <Tappable onPress={() => setShowEnd((s) => !s)} hitSlop={6}>
                            <Text variant="bodyStrong" color={Palette.primary}>
                              {fmtTime(endTime)}
                            </Text>
                          </Tappable>
                          <Tappable onPress={() => { setEndTime(null); setShowEnd(false); }} hitSlop={6} accessibilityLabel="Retirer la fin">
                            <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
                          </Tappable>
                        </View>
                      ) : (
                        <Tappable
                          onPress={() => {
                            const d = new Date(startTime);
                            d.setHours(d.getHours() + 1);
                            setEndTime(d);
                            setShowEnd(true);
                          }}
                          hitSlop={6}>
                          <Text variant="bodyStrong" color={Palette.textSecondary}>
                            Ajouter
                          </Text>
                        </Tappable>
                      )}
                    </Row>
                    {endTime && showEnd ? (
                      <DateTimePicker
                        value={endTime}
                        mode="time"
                        is24Hour
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={(_e, d) => {
                          if (Platform.OS !== 'ios') setShowEnd(false);
                          if (d) setEndTime(d);
                        }}
                      />
                    ) : null}
                  </>
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

                <TextInput
                  style={styles.descInput}
                  placeholder="Note (facultatif)"
                  placeholderTextColor={Palette.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                />

                <View style={styles.actions}>
                  <View style={{ flex: 1 }}>
                    <Button label="Annuler" variant="ghost" onPress={closeForm} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Button
                      label={editing ? 'Enregistrer' : 'Créer'}
                      onPress={save}
                      loading={saving}
                      disabled={!title.trim() || saving}
                    />
                  </View>
                </View>
              </ScrollView>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </Screen>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.rowBetween}>
      <Text variant="bodyStrong">{label}</Text>
      {children}
    </View>
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
    marginHorizontal: Spacing.lg,
    maxHeight: '86%',
  },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  input: {
    color: Palette.text,
    ...Type.body,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.md,
  },
  descInput: {
    color: Palette.text,
    ...Type.body,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    minHeight: 72,
    marginTop: Spacing.md,
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
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
});
