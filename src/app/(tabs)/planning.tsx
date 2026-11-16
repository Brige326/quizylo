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

type ViewMode = 'day' | 'week' | 'month';

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function startOfWeek(d: Date): Date {
  const s = startOfDay(d);
  const off = (s.getDay() + 6) % 7; // lundi = 0
  return addDays(s, -off);
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
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
function fmtDM(d: Date): string {
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function fmtDateShort(d: Date): string {
  return cap(d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }));
}
function fmtWeekday(d: Date): string {
  return cap(d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric' }));
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

  const [view, setView] = useState<ViewMode>('day');
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

  // Bornes de la plage à charger selon la vue.
  const range = useMemo(() => {
    if (view === 'day') return { start: startOfDay(day), end: addDays(startOfDay(day), 1) };
    if (view === 'week') {
      const s = startOfWeek(day);
      return { start: s, end: addDays(s, 7) };
    }
    const gridStart = startOfWeek(startOfMonth(day));
    return { start: gridStart, end: addDays(gridStart, 42) };
  }, [view, day]);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setEvents(await listEventsBetween(userId, range.start.toISOString(), range.end.toISOString()));
    } catch {
      // rien d'inventé
    } finally {
      setLoading(false);
    }
  }, [userId, range.start, range.end]);

  useEffect(() => {
    load();
  }, [load]);

  const byDay = useMemo(() => {
    const m = new Map<string, EventItem[]>();
    for (const e of events) {
      const k = dateKey(new Date(e.starts_at));
      const arr = m.get(k);
      if (arr) arr.push(e);
      else m.set(k, [e]);
    }
    return m;
  }, [events]);

  const today = startOfDay(new Date());
  const periodHasToday = useMemo(() => {
    if (view === 'day') return sameDay(day, today);
    if (view === 'week') {
      const s = startOfWeek(day);
      return today >= s && today < addDays(s, 7);
    }
    return today.getFullYear() === day.getFullYear() && today.getMonth() === day.getMonth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, day]);

  const step = (dir: number) => {
    if (view === 'day') setDay((d) => addDays(d, dir));
    else if (view === 'week') setDay((d) => addDays(d, dir * 7));
    else setDay((d) => addMonths(d, dir));
  };

  const periodLabel = useMemo(() => {
    if (view === 'day') return fmtDay(day);
    if (view === 'week') {
      const s = startOfWeek(day);
      return `${fmtDM(s)} – ${fmtDM(addDays(s, 6))}`;
    }
    return cap(day.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }));
  }, [view, day]);

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setShowDate(false);
    setShowStart(false);
    setShowEnd(false);
  };

  const openAdd = (forDate?: Date) => {
    setEditing(null);
    setTitle('');
    setCategory(CATEGORIES[0].key);
    setDescription('');
    setAllDay(false);
    setFormDate(startOfDay(forDate ?? day));
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
      setDay(startOfDay(formDate));
      if (sameDay(formDate, day)) await load();
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
            {periodHasToday && view === 'day' ? "Aujourd'hui" : periodLabel}
          </Text>
        </View>
        <Tappable style={styles.addBtn} onPress={() => openAdd()} accessibilityLabel="Ajouter une activité">
          <Ionicons name="add" size={26} color={Palette.onPrimary} />
        </Tappable>
      </View>

      {/* Sélecteur de vue */}
      <View style={styles.segment}>
        <SegBtn label="Jour" active={view === 'day'} onPress={() => setView('day')} />
        <SegBtn label="Semaine" active={view === 'week'} onPress={() => setView('week')} />
        <SegBtn label="Mois" active={view === 'month'} onPress={() => setView('month')} />
      </View>

      {/* Navigation de période */}
      <View style={styles.dateBar}>
        <Tappable style={styles.navArrow} onPress={() => step(-1)} accessibilityLabel="Précédent">
          <Ionicons name="chevron-back" size={22} color={Palette.text} />
        </Tappable>
        <View style={styles.dateCenter}>
          <Text variant="bodyStrong">{periodLabel}</Text>
          {!periodHasToday ? (
            <Tappable onPress={() => setDay(startOfDay(new Date()))} hitSlop={8}>
              <Text variant="small" color={Palette.primary}>
                Aujourd'hui
              </Text>
            </Tappable>
          ) : null}
        </View>
        <Tappable style={styles.navArrow} onPress={() => step(1)} accessibilityLabel="Suivant">
          <Ionicons name="chevron-forward" size={22} color={Palette.text} />
        </Tappable>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={Palette.primary} />
        </View>
      ) : view === 'day' ? (
        <DayView events={byDay.get(dateKey(day)) ?? []} onAdd={() => openAdd()} onPress={openEdit} />
      ) : view === 'week' ? (
        <WeekView weekStart={startOfWeek(day)} byDay={byDay} today={today} onPressEvent={openEdit} onAddDay={openAdd} />
      ) : (
        <MonthView
          month={day}
          byDay={byDay}
          today={today}
          onPickDay={(d) => {
            setDay(startOfDay(d));
            setView('day');
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

/* ---------- Vues ---------- */

function EventRow({ item, onPress }: { item: EventItem; onPress: () => void }) {
  const cat = categoryOf(item.category);
  return (
    <Tappable style={styles.eventRow} onPress={onPress} haptic={false}>
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
}

function DayView({
  events,
  onAdd,
  onPress,
}: {
  events: EventItem[];
  onAdd: () => void;
  onPress: (e: EventItem) => void;
}) {
  if (events.length === 0) {
    return (
      <EmptyState
        icon="sunny-outline"
        title="Journée libre"
        subtitle="Rien de prévu ce jour. Ajoute une activité pour organiser ta journée.">
        <Button label="Ajouter une activité" onPress={onAdd} />
      </EmptyState>
    );
  }
  return (
    <FlatList
      data={events}
      keyExtractor={(e) => e.id}
      contentContainerStyle={styles.list}
      showsVerticalScrollIndicator={false}
      renderItem={({ item }) => <EventRow item={item} onPress={() => onPress(item)} />}
    />
  );
}

function WeekView({
  weekStart,
  byDay,
  today,
  onPressEvent,
  onAddDay,
}: {
  weekStart: Date;
  byDay: Map<string, EventItem[]>;
  today: Date;
  onPressEvent: (e: EventItem) => void;
  onAddDay: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <ScrollView contentContainerStyle={styles.weekBody} showsVerticalScrollIndicator={false}>
      {days.map((d) => {
        const evs = byDay.get(dateKey(d)) ?? [];
        const isToday = sameDay(d, today);
        return (
          <View key={dateKey(d)} style={styles.weekDay}>
            <View style={styles.weekDayHead}>
              <Text variant="bodyStrong" color={isToday ? Palette.primary : Palette.text}>
                {fmtWeekday(d)}
              </Text>
              <Tappable onPress={() => onAddDay(d)} hitSlop={8} accessibilityLabel="Ajouter ce jour">
                <Ionicons name="add" size={20} color={Palette.textSecondary} />
              </Tappable>
            </View>
            {evs.length === 0 ? (
              <Text variant="small" color={Palette.textMuted} style={{ paddingVertical: Spacing.xs }}>
                Libre
              </Text>
            ) : (
              evs.map((e) => {
                const cat = categoryOf(e.category);
                return (
                  <Tappable key={e.id} style={styles.weekEvent} onPress={() => onPressEvent(e)} haptic={false}>
                    <View style={[styles.weekDot, { backgroundColor: cat.color }]} />
                    <Text variant="small" color={Palette.textSecondary} style={{ width: 46 }}>
                      {e.all_day ? 'Jour' : fmtTime(e.starts_at)}
                    </Text>
                    <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                      {e.title}
                    </Text>
                  </Tappable>
                );
              })
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const WEEKDAY_LABELS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

function MonthView({
  month,
  byDay,
  today,
  onPickDay,
}: {
  month: Date;
  byDay: Map<string, EventItem[]>;
  today: Date;
  onPickDay: (d: Date) => void;
}) {
  const gridStart = startOfWeek(startOfMonth(month));
  const cells = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  return (
    <ScrollView contentContainerStyle={styles.monthBody} showsVerticalScrollIndicator={false}>
      <View style={styles.weekLabels}>
        {WEEKDAY_LABELS.map((l, i) => (
          <Text key={i} variant="small" color={Palette.textMuted} style={styles.weekLabel}>
            {l}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((d) => {
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = sameDay(d, today);
          const has = (byDay.get(dateKey(d)) ?? []).length > 0;
          return (
            <Pressable key={dateKey(d)} style={styles.cell} onPress={() => onPickDay(d)}>
              <View style={[styles.cellInner, isToday && styles.cellToday]}>
                <Text
                  variant="small"
                  color={isToday ? Palette.onPrimary : inMonth ? Palette.text : Palette.textMuted}>
                  {d.getDate()}
                </Text>
              </View>
              {has ? <View style={[styles.cellDot, isToday && { backgroundColor: Palette.onPrimary }]} /> : <View style={styles.cellDotPlaceholder} />}
            </Pressable>
          );
        })}
      </View>
      <Text variant="small" color={Palette.textMuted} center style={{ marginTop: Spacing.md }}>
        Touche un jour pour voir son détail.
      </Text>
    </ScrollView>
  );
}

function SegBtn({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Tappable style={[styles.segBtn, active && styles.segBtnActive]} onPress={onPress} haptic={false}>
      <Text variant="bodyStrong" color={active ? Palette.onPrimary : Palette.textSecondary}>
        {label}
      </Text>
    </Tappable>
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
  segBtnActive: { backgroundColor: Palette.primary },
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
  // Semaine
  weekBody: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  weekDay: {
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  weekDayHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  weekEvent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: 6 },
  weekDot: { width: 8, height: 8, borderRadius: 4 },
  // Mois
  monthBody: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.xl },
  weekLabels: { flexDirection: 'row', marginBottom: Spacing.xs },
  weekLabel: { flex: 1, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', gap: 3 },
  cellInner: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  cellToday: { backgroundColor: Palette.primary },
  cellDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: Palette.primary },
  cellDotPlaceholder: { width: 5, height: 5 },
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
