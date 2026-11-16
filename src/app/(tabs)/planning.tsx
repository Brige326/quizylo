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
import { cancelReminder, scheduleReminder } from '@/lib/notifications';
import {
  CATEGORIES,
  categoryOf,
  createEvent,
  createTask,
  deleteEvent,
  deleteTask,
  listEventsBetween,
  listRecurringEvents,
  listTasksBetween,
  organizeDay,
  setTaskDone,
  updateEvent,
  updateTask,
  type EventItem,
  type EventLink,
  type TaskItem,
} from '@/lib/planning';
import { listChapters, listSubjects, type Chapter, type Subject } from '@/lib/courses';

type ViewMode = 'day' | 'week' | 'month';

const REMINDERS: { min: number | null; label: string }[] = [
  { min: null, label: 'Aucun' },
  { min: 0, label: "À l'heure" },
  { min: 5, label: '5 min avant' },
  { min: 15, label: '15 min avant' },
  { min: 30, label: '30 min avant' },
  { min: 60, label: '1 h avant' },
  { min: 1440, label: '1 jour avant' },
];
function reminderLabel(min: number | null): string {
  return REMINDERS.find((r) => r.min === min)?.label ?? 'Aucun';
}
function dayAt(date: Date, h: number): Date {
  const d = new Date(date);
  d.setHours(h, 0, 0, 0);
  return d;
}

const RECURRENCES: { key: string; label: string }[] = [
  { key: 'none', label: 'Jamais' },
  { key: 'daily', label: 'Chaque jour' },
  { key: 'weekly', label: 'Chaque semaine' },
  { key: 'monthly', label: 'Chaque mois' },
];
function recurrenceLabel(key: string): string {
  return RECURRENCES.find((r) => r.key === key)?.label ?? 'Jamais';
}
// k-ième occurrence d'un événement récurrent (conserve l'heure de la base).
function occStartOf(S: Date, r: string, k: number): Date {
  if (r === 'weekly') {
    const d = new Date(S);
    d.setDate(d.getDate() + k * 7);
    return d;
  }
  if (r === 'monthly') {
    return new Date(S.getFullYear(), S.getMonth() + k, S.getDate(), S.getHours(), S.getMinutes(), 0, 0);
  }
  const d = new Date(S);
  d.setDate(d.getDate() + k);
  return d;
}
// Occurrences d'un événement récurrent dont le début tombe dans [start, end).
function expandEvent(e: EventItem, start: Date, end: Date): EventItem[] {
  const S = new Date(e.starts_at);
  const dur = e.ends_at ? new Date(e.ends_at).getTime() - S.getTime() : 0;
  const out: EventItem[] = [];
  for (let k = 0; k < 1000; k++) {
    const o = occStartOf(S, e.recurrence, k);
    if (o.getTime() >= end.getTime()) break;
    if (o.getTime() >= start.getTime()) {
      out.push({
        ...e,
        starts_at: o.toISOString(),
        ends_at: dur ? new Date(o.getTime() + dur).toISOString() : null,
      });
    }
  }
  return out;
}
// Prochaine occurrence (début) >= maintenant, pour planifier le rappel d'un événement récurrent.
function nextOccurrence(S: Date, r: string): Date {
  const now = Date.now();
  for (let k = 0; k < 1000; k++) {
    const o = occStartOf(S, r, k);
    if (o.getTime() >= now) return o;
  }
  return S;
}

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
function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}
// Clé 'YYYY-MM-DD' en heure locale (format des échéances de tâches).
function ymd(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
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
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Choix Événement / Tâche à l'ajout
  const [chooserOpen, setChooserOpen] = useState(false);

  // Formulaire de tâche
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskEditing, setTaskEditing] = useState<TaskItem | null>(null);
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCategory, setTaskCategory] = useState(CATEGORIES[0].key);
  const [taskDate, setTaskDate] = useState<Date>(() => startOfDay(new Date()));
  const [taskDesc, setTaskDesc] = useState('');
  const [taskShowDate, setTaskShowDate] = useState(false);
  const [taskReminderMin, setTaskReminderMin] = useState<number | null>(null);
  const [taskSaving, setTaskSaving] = useState(false);

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
  const [reminderMin, setReminderMin] = useState<number | null>(null);
  const [recurrence, setRecurrence] = useState('none');
  const [saving, setSaving] = useState(false);

  // Feuilles de choix
  const [reminderSheetFor, setReminderSheetFor] = useState<'event' | 'task' | null>(null);
  const [recurrenceSheetOpen, setRecurrenceSheetOpen] = useState(false);

  // Événements récurrents (bruts) pour générer les occurrences.
  const [recurringEvents, setRecurringEvents] = useState<EventItem[]>([]);

  // Liaison de l'événement à un chapitre de Mes cours
  type LinkSel = { chapterId: string; subjectId: string; subjectName: string; chapterName: string; color: string };
  const [link, setLink] = useState<LinkSel | null>(null);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [linkSubjects, setLinkSubjects] = useState<Subject[]>([]);
  const [linkChapters, setLinkChapters] = useState<Chapter[]>([]);
  const [linkPickSubject, setLinkPickSubject] = useState<Subject | null>(null);

  // Assistant d'organisation
  const [organizeOpen, setOrganizeOpen] = useState(false);
  const [organizeReq, setOrganizeReq] = useState('');
  const [organizeText, setOrganizeText] = useState<string | null>(null);
  const [organizeLoading, setOrganizeLoading] = useState(false);

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
      const [ev, rec, tk] = await Promise.all([
        listEventsBetween(userId, range.start.toISOString(), range.end.toISOString()),
        listRecurringEvents(userId),
        listTasksBetween(userId, ymd(range.start), ymd(range.end)),
      ]);
      // Dans la plage, on ne garde que les non-récurrents ; les récurrents sont générés depuis `rec`.
      setEvents(ev.filter((e) => e.recurrence === 'none'));
      setRecurringEvents(rec);
      setTasks(tk);
    } catch {
      // rien d'inventé
    } finally {
      setLoading(false);
    }
  }, [userId, range.start, range.end]);

  useEffect(() => {
    load();
  }, [load]);

  // Tous les événements affichés = non-récurrents dans la plage + occurrences générées.
  const allEvents = useMemo(() => {
    const out = [...events];
    for (const e of recurringEvents) out.push(...expandEvent(e, range.start, range.end));
    return out;
  }, [events, recurringEvents, range.start, range.end]);

  const byDay = useMemo(() => {
    const m = new Map<string, EventItem[]>();
    for (const e of allEvents) {
      const k = dateKey(new Date(e.starts_at));
      const arr = m.get(k);
      if (arr) arr.push(e);
      else m.set(k, [e]);
    }
    // tri par heure dans chaque jour
    for (const arr of m.values()) {
      arr.sort((a, b) => Number(b.all_day) - Number(a.all_day) || a.starts_at.localeCompare(b.starts_at));
    }
    return m;
  }, [allEvents]);

  // Tâches regroupées par échéance (clé 'YYYY-MM-DD').
  const tasksByDay = useMemo(() => {
    const m = new Map<string, TaskItem[]>();
    for (const t of tasks) {
      const arr = m.get(t.due_date);
      if (arr) arr.push(t);
      else m.set(t.due_date, [t]);
    }
    return m;
  }, [tasks]);

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
    setReminderMin(null);
    setRecurrence('none');
    setLink(null);
    setShowDate(false);
    setShowStart(false);
    setShowEnd(false);
    setFormOpen(true);
  };

  const openEdit = (occ: EventItem) => {
    // Pour un événement récurrent, on édite la SÉRIE (sa définition de base), pas l'occurrence affichée.
    const e = occ.recurrence !== 'none' ? recurringEvents.find((x) => x.id === occ.id) ?? occ : occ;
    const s = new Date(e.starts_at);
    setEditing(e);
    setTitle(e.title);
    setCategory(e.category);
    setDescription(e.description ?? '');
    setAllDay(e.all_day);
    setFormDate(startOfDay(s));
    setStartTime(s);
    setEndTime(e.ends_at ? new Date(e.ends_at) : null);
    setReminderMin(e.reminder_minutes ?? null);
    setRecurrence(e.recurrence ?? 'none');
    setLink(
      e.linked_chapter_id && e.linked_subject_id
        ? {
            chapterId: e.linked_chapter_id,
            subjectId: e.linked_subject_id,
            subjectName: e.linked_subject_name ?? '',
            chapterName: e.linked_chapter_name ?? '',
            color: e.linked_color ?? Palette.primary,
          }
        : null,
    );
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
    // Rappel : on annule l'ancien, on planifie le nouveau si demandé et à venir.
    if (editing?.notif_id) await cancelReminder(editing.notif_id);
    let notifId: string | null = null;
    if (reminderMin != null) {
      const refBase = allDay ? dayAt(formDate, 9) : start;
      // Pour un événement récurrent, le rappel vise la prochaine occurrence à venir.
      const reference = recurrence !== 'none' ? nextOccurrence(refBase, recurrence) : refBase;
      const trigger = new Date(reference.getTime() - reminderMin * 60000);
      notifId = await scheduleReminder(trigger, title.trim(), 'Rappel Quizylo');
    }
    const eventLink: EventLink | undefined = link
      ? {
          linkedChapterId: link.chapterId,
          linkedSubjectId: link.subjectId,
          linkedSubjectName: link.subjectName,
          linkedChapterName: link.chapterName,
          linkedColor: link.color,
        }
      : undefined;
    const payload = {
      title,
      category,
      startsAt: start.toISOString(),
      endsAt: endISO,
      allDay,
      description: description.trim() || null,
      reminderMinutes: reminderMin,
      notifId,
      recurrence,
      link: eventLink,
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
          await cancelReminder(e.notif_id);
          try {
            await deleteEvent(e.id);
          } catch {
            load();
          }
        },
      },
    ]);
  };

  /* ---------- Tâches ---------- */

  const openAddTask = (forDate?: Date) => {
    setChooserOpen(false);
    setTaskEditing(null);
    setTaskTitle('');
    setTaskCategory(CATEGORIES[0].key);
    setTaskDate(startOfDay(forDate ?? day));
    setTaskDesc('');
    setTaskReminderMin(null);
    setTaskShowDate(false);
    setTaskOpen(true);
  };

  const openEditTask = (t: TaskItem) => {
    setTaskEditing(t);
    setTaskTitle(t.title);
    setTaskCategory(t.category);
    setTaskDate(startOfDay(parseYmd(t.due_date)));
    setTaskDesc(t.description ?? '');
    setTaskReminderMin(t.reminder_minutes ?? null);
    setTaskShowDate(false);
    setTaskOpen(true);
  };

  const closeTask = () => {
    if (taskSaving) return;
    setTaskOpen(false);
    setTaskShowDate(false);
  };

  const saveTask = async () => {
    if (!taskTitle.trim() || !userId) return;
    setTaskSaving(true);
    if (taskEditing?.notif_id) await cancelReminder(taskEditing.notif_id);
    let notifId: string | null = null;
    if (taskReminderMin != null) {
      const trigger = new Date(dayAt(taskDate, 9).getTime() - taskReminderMin * 60000);
      notifId = await scheduleReminder(trigger, taskTitle.trim(), 'Rappel Quizylo');
    }
    const payload = {
      title: taskTitle,
      category: taskCategory,
      dueDate: ymd(taskDate),
      description: taskDesc.trim() || null,
      reminderMinutes: taskReminderMin,
      notifId,
    };
    try {
      if (taskEditing) await updateTask(taskEditing.id, payload);
      else await createTask({ userId, ...payload });
      setTaskOpen(false);
      setDay(startOfDay(taskDate));
      if (sameDay(taskDate, day)) await load();
    } catch {
      Alert.alert('Oups', "La tâche n'a pas pu être enregistrée.");
    } finally {
      setTaskSaving(false);
    }
  };

  const onDeleteTask = () => {
    const t = taskEditing;
    if (!t) return;
    Alert.alert('Supprimer', `« ${t.title} » sera supprimée.`, [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          setTaskOpen(false);
          setTasks((prev) => prev.filter((x) => x.id !== t.id));
          await cancelReminder(t.notif_id);
          try {
            await deleteTask(t.id);
          } catch {
            load();
          }
        },
      },
    ]);
  };

  const toggleTask = async (t: TaskItem) => {
    const next = !t.done;
    setTasks((prev) => prev.map((x) => (x.id === t.id ? { ...x, done: next } : x)));
    try {
      await setTaskDone(t.id, next);
    } catch {
      load();
    }
  };

  /* ---------- Liaison Mes cours ---------- */

  const openLinkPicker = async () => {
    if (!userId) return;
    setLinkPickSubject(null);
    setLinkChapters([]);
    setLinkPickerOpen(true);
    try {
      setLinkSubjects(await listSubjects(userId));
    } catch {
      setLinkSubjects([]);
    }
  };

  const pickLinkSubject = async (s: Subject) => {
    setLinkPickSubject(s);
    try {
      setLinkChapters(await listChapters(s.id));
    } catch {
      setLinkChapters([]);
    }
  };

  const pickLinkChapter = (c: Chapter) => {
    if (!linkPickSubject) return;
    setLink({
      chapterId: c.id,
      subjectId: linkPickSubject.id,
      subjectName: linkPickSubject.name,
      chapterName: c.name,
      color: linkPickSubject.color,
    });
    setLinkPickerOpen(false);
  };

  const openLinkedChapter = () => {
    if (!link) return;
    setFormOpen(false);
    router.push({
      pathname: '/chapitre/[id]',
      params: { id: link.chapterId, subjectId: link.subjectId, name: link.chapterName, color: link.color },
    });
  };

  /* ---------- Assistant d'organisation ---------- */

  const openOrganize = () => {
    setOrganizeReq('');
    setOrganizeText(null);
    setOrganizeOpen(true);
  };

  const closeOrganize = () => {
    if (!organizeLoading) setOrganizeOpen(false);
  };

  const runOrganize = async () => {
    if (!userId) return;
    setOrganizeLoading(true);
    setOrganizeText(null);
    const dayEvents = (byDay.get(dateKey(day)) ?? []).map((e) => ({
      title: e.title,
      start: e.all_day ? null : e.starts_at,
      end: e.ends_at,
      allDay: e.all_day,
    }));
    const dayTasks = (tasksByDay.get(ymd(day)) ?? []).map((t) => ({ title: t.title }));
    try {
      const res = await organizeDay({
        request: organizeReq.trim(),
        day: fmtDay(day),
        events: dayEvents,
        tasks: dayTasks,
      });
      if (!res.configured) {
        setOrganizeText("⚠️ L'assistant IA n'est pas encore activé sur ton compte. On le branche très bientôt.");
      } else if (res.error || !res.text) {
        setOrganizeText("La proposition n'a pas pu être générée. Réessaie dans un instant.");
      } else {
        setOrganizeText(res.text);
      }
    } catch {
      setOrganizeText("L'assistant est injoignable pour le moment.");
    } finally {
      setOrganizeLoading(false);
    }
  };

  if (isGuest || !userId) {
    return (
      <Screen>
        <TopBar />
        <EmptyState
          icon="calendar-outline"
          eyebrow="Ton agenda"
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
        <Tappable style={styles.navArrow} onPress={openOrganize} accessibilityLabel="Organiser ma journée">
          <Ionicons name="sparkles-outline" size={20} color={Palette.text} />
        </Tappable>
        <Tappable style={styles.addBtn} onPress={() => setChooserOpen(true)} accessibilityLabel="Ajouter">
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
        <DayView
          events={byDay.get(dateKey(day)) ?? []}
          tasks={tasksByDay.get(ymd(day)) ?? []}
          onAdd={() => setChooserOpen(true)}
          onPress={openEdit}
          onPressTask={openEditTask}
          onToggleTask={toggleTask}
        />
      ) : view === 'week' ? (
        <WeekView
          weekStart={startOfWeek(day)}
          byDay={byDay}
          tasksByDay={tasksByDay}
          today={today}
          onPressEvent={openEdit}
          onPressTask={openEditTask}
          onToggleTask={toggleTask}
          onAddDay={openAdd}
        />
      ) : (
        <MonthView
          month={day}
          byDay={byDay}
          tasksByDay={tasksByDay}
          today={today}
          onPickDay={(d) => {
            setDay(startOfDay(d));
            setView('day');
          }}
        />
      )}

      {/* Page : création / modification d'un événement */}
      <Modal visible={formOpen} animationType="slide" onRequestClose={closeForm}>
        <View style={styles.page}>
          <View style={[styles.pageHeader, { paddingTop: insets.top + Spacing.xs }]}>
            <Tappable onPress={closeForm} hitSlop={12} scaleTo={0.9} accessibilityLabel="Fermer">
              <Ionicons name="close" size={26} color={Palette.text} />
            </Tappable>
            <Text variant="heading">{editing ? "Modifier l'activité" : 'Nouvel événement'}</Text>
            {editing ? (
              <Tappable onPress={onDelete} hitSlop={10} accessibilityLabel="Supprimer">
                <Ionicons name="trash-outline" size={22} color={Palette.danger} />
              </Tappable>
            ) : (
              <View style={{ width: 26 }} />
            )}
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.pageBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>

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

                <Row label="Rappel">
                  <Tappable onPress={() => setReminderSheetFor('event')} hitSlop={6}>
                    <Text variant="bodyStrong" color={reminderMin != null ? Palette.primary : Palette.textSecondary}>
                      {reminderLabel(reminderMin)}
                    </Text>
                  </Tappable>
                </Row>

                <Row label="Répéter">
                  <Tappable onPress={() => setRecurrenceSheetOpen(true)} hitSlop={6}>
                    <Text variant="bodyStrong" color={recurrence !== 'none' ? Palette.primary : Palette.textSecondary}>
                      {recurrenceLabel(recurrence)}
                    </Text>
                  </Tappable>
                </Row>

                <Row label="Cours lié">
                  {link ? (
                    <Tappable onPress={() => setLink(null)} hitSlop={6} accessibilityLabel="Retirer le lien">
                      <Ionicons name="close-circle" size={18} color={Palette.textMuted} />
                    </Tappable>
                  ) : (
                    <Tappable onPress={openLinkPicker} hitSlop={6}>
                      <Text variant="bodyStrong" color={Palette.textSecondary}>
                        Lier
                      </Text>
                    </Tappable>
                  )}
                </Row>
                {link ? (
                  <Tappable style={styles.linkOpen} onPress={openLinkedChapter} haptic={false}>
                    <Ionicons name="book-outline" size={18} color={link.color} />
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                      {link.subjectName} › {link.chapterName}
                    </Text>
                    <Ionicons name="open-outline" size={18} color={Palette.textMuted} />
                  </Tappable>
                ) : null}

                <TextInput
                  style={styles.descInput}
                  placeholder="Note (facultatif)"
                  placeholderTextColor={Palette.textMuted}
                  value={description}
                  onChangeText={setDescription}
                  multiline
                  textAlignVertical="top"
                />

            </ScrollView>
            <View style={[styles.pageFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
              <Button
                label={editing ? 'Enregistrer' : 'Créer'}
                onPress={save}
                loading={saving}
                disabled={!title.trim() || saving}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Feuille : Événement ou Tâche */}
      <Modal visible={chooserOpen} transparent animationType="fade" onRequestClose={() => setChooserOpen(false)}>
        <Pressable style={styles.bottomBackdrop} onPress={() => setChooserOpen(false)}>
          <Pressable style={[styles.addSheet, { paddingBottom: insets.bottom + Spacing.md }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Tappable style={styles.addRow} onPress={() => { setChooserOpen(false); openAdd(); }} haptic={false}>
              <Ionicons name="calendar-outline" size={22} color={Palette.text} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                Nouvel événement
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
            </Tappable>
            <Tappable style={[styles.addRow, { borderBottomWidth: 0 }]} onPress={() => openAddTask()} haptic={false}>
              <Ionicons name="checkbox-outline" size={22} color={Palette.text} />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                Nouvelle tâche
              </Text>
              <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
            </Tappable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Page : création / modification d'une tâche */}
      <Modal visible={taskOpen} animationType="slide" onRequestClose={closeTask}>
        <View style={styles.page}>
          <View style={[styles.pageHeader, { paddingTop: insets.top + Spacing.xs }]}>
            <Tappable onPress={closeTask} hitSlop={12} scaleTo={0.9} accessibilityLabel="Fermer">
              <Ionicons name="close" size={26} color={Palette.text} />
            </Tappable>
            <Text variant="heading">{taskEditing ? 'Modifier la tâche' : 'Nouvelle tâche'}</Text>
            {taskEditing ? (
              <Tappable onPress={onDeleteTask} hitSlop={10} accessibilityLabel="Supprimer">
                <Ionicons name="trash-outline" size={22} color={Palette.danger} />
              </Tappable>
            ) : (
              <View style={{ width: 26 }} />
            )}
          </View>
          <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={styles.pageBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>

                <TextInput
                  style={styles.input}
                  placeholder="Tâche (ex. Faire les courses)"
                  placeholderTextColor={Palette.textMuted}
                  value={taskTitle}
                  onChangeText={setTaskTitle}
                  maxLength={80}
                />

                <Row label="Échéance">
                  <Tappable onPress={() => setTaskShowDate((s) => !s)} hitSlop={6}>
                    <Text variant="bodyStrong" color={Palette.primary}>
                      {fmtDateShort(taskDate)}
                    </Text>
                  </Tappable>
                </Row>
                {taskShowDate ? (
                  <DateTimePicker
                    value={taskDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'inline' : 'default'}
                    onChange={(_e, d) => {
                      if (Platform.OS !== 'ios') setTaskShowDate(false);
                      if (d) setTaskDate(startOfDay(d));
                    }}
                  />
                ) : null}

                <Text variant="small" color={Palette.textSecondary} style={{ marginTop: Spacing.sm }}>
                  Catégorie
                </Text>
                <View style={styles.catRow}>
                  {CATEGORIES.map((c) => {
                    const active = c.key === taskCategory;
                    return (
                      <Tappable
                        key={c.key}
                        style={[styles.catChip, active && { backgroundColor: c.color + '33', borderColor: c.color }]}
                        onPress={() => setTaskCategory(c.key)}
                        haptic={false}>
                        <View style={[styles.catDot, { backgroundColor: c.color }]} />
                        <Text variant="small" color={active ? Palette.text : Palette.textSecondary}>
                          {c.label}
                        </Text>
                      </Tappable>
                    );
                  })}
                </View>

                <Row label="Rappel">
                  <Tappable onPress={() => setReminderSheetFor('task')} hitSlop={6}>
                    <Text variant="bodyStrong" color={taskReminderMin != null ? Palette.primary : Palette.textSecondary}>
                      {reminderLabel(taskReminderMin)}
                    </Text>
                  </Tappable>
                </Row>

                <TextInput
                  style={styles.descInput}
                  placeholder="Note (facultatif)"
                  placeholderTextColor={Palette.textMuted}
                  value={taskDesc}
                  onChangeText={setTaskDesc}
                  multiline
                  textAlignVertical="top"
                />

            </ScrollView>
            <View style={[styles.pageFooter, { paddingBottom: insets.bottom + Spacing.md }]}>
              <Button
                label={taskEditing ? 'Enregistrer' : 'Créer'}
                onPress={saveTask}
                loading={taskSaving}
                disabled={!taskTitle.trim() || taskSaving}
              />
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Feuille : choix du rappel */}
      <Modal
        visible={reminderSheetFor !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setReminderSheetFor(null)}>
        <Pressable style={styles.bottomBackdrop} onPress={() => setReminderSheetFor(null)}>
          <Pressable style={[styles.addSheet, { paddingBottom: insets.bottom + Spacing.md }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text variant="heading" style={{ marginBottom: Spacing.sm }}>
              Rappel
            </Text>
            {REMINDERS.map((r, i) => {
              const selected = reminderSheetFor === 'event' ? reminderMin === r.min : taskReminderMin === r.min;
              return (
                <Tappable
                  key={String(r.min)}
                  style={[styles.addRow, i === REMINDERS.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => {
                    if (reminderSheetFor === 'event') setReminderMin(r.min);
                    else setTaskReminderMin(r.min);
                    setReminderSheetFor(null);
                  }}
                  haptic={false}>
                  <Text variant="bodyStrong" style={{ flex: 1 }}>
                    {r.label}
                  </Text>
                  {selected ? <Ionicons name="checkmark" size={20} color={Palette.primary} /> : null}
                </Tappable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Feuille : choix de la récurrence */}
      <Modal
        visible={recurrenceSheetOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setRecurrenceSheetOpen(false)}>
        <Pressable style={styles.bottomBackdrop} onPress={() => setRecurrenceSheetOpen(false)}>
          <Pressable style={[styles.addSheet, { paddingBottom: insets.bottom + Spacing.md }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text variant="heading" style={{ marginBottom: Spacing.sm }}>
              Répéter
            </Text>
            {RECURRENCES.map((r, i) => (
              <Tappable
                key={r.key}
                style={[styles.addRow, i === RECURRENCES.length - 1 && { borderBottomWidth: 0 }]}
                onPress={() => {
                  setRecurrence(r.key);
                  setRecurrenceSheetOpen(false);
                }}
                haptic={false}>
                <Text variant="bodyStrong" style={{ flex: 1 }}>
                  {r.label}
                </Text>
                {recurrence === r.key ? <Ionicons name="checkmark" size={20} color={Palette.primary} /> : null}
              </Tappable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      {/* Sélecteur : matière puis chapitre */}
      <Modal visible={linkPickerOpen} transparent animationType="fade" onRequestClose={() => setLinkPickerOpen(false)}>
        <Pressable style={styles.bottomBackdrop} onPress={() => setLinkPickerOpen(false)}>
          <Pressable style={[styles.addSheet, { paddingBottom: insets.bottom + Spacing.md, maxHeight: '70%' }]} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHead}>
              <Text variant="heading">{linkPickSubject ? linkPickSubject.name : 'Choisir une matière'}</Text>
              {linkPickSubject ? (
                <Tappable onPress={() => setLinkPickSubject(null)} hitSlop={8}>
                  <Text variant="small" color={Palette.primary}>
                    Retour
                  </Text>
                </Tappable>
              ) : null}
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {!linkPickSubject ? (
                linkSubjects.length === 0 ? (
                  <Text variant="small" color={Palette.textMuted} style={{ paddingVertical: Spacing.md }}>
                    Crée d'abord une matière dans Mes cours.
                  </Text>
                ) : (
                  linkSubjects.map((s) => (
                    <Tappable key={s.id} style={styles.addRow} onPress={() => pickLinkSubject(s)} haptic={false}>
                      <View style={[styles.catDot, { backgroundColor: s.color }]} />
                      <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                        {s.name}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
                    </Tappable>
                  ))
                )
              ) : linkChapters.length === 0 ? (
                <Text variant="small" color={Palette.textMuted} style={{ paddingVertical: Spacing.md }}>
                  Cette matière n'a pas encore de chapitre.
                </Text>
              ) : (
                linkChapters.map((c) => (
                  <Tappable key={c.id} style={styles.addRow} onPress={() => pickLinkChapter(c)} haptic={false}>
                    <Ionicons name="list" size={18} color={linkPickSubject.color} />
                    <Text variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                      {c.name}
                    </Text>
                  </Tappable>
                ))
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Assistant d'organisation */}
      <Modal visible={organizeOpen} transparent animationType="fade" onRequestClose={closeOrganize}>
        <Pressable style={styles.backdrop} onPress={closeOrganize}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <Text variant="heading">Organiser ma journée</Text>
              <Text variant="small" color={Palette.textSecondary}>
                Décris ce que tu veux caser ; l'assistant proposera un emploi du temps à ajuster.
              </Text>
              <TextInput
                style={styles.descInput}
                placeholder="Ex. 1 h de sport, réviser les maths 45 min, faire les courses…"
                placeholderTextColor={Palette.textMuted}
                value={organizeReq}
                onChangeText={setOrganizeReq}
                multiline
                textAlignVertical="top"
              />
              {organizeText ? (
                <ScrollView style={styles.proposal} showsVerticalScrollIndicator={false}>
                  <Text variant="body" color={Palette.textSecondary} style={{ lineHeight: 22 }}>
                    {organizeText}
                  </Text>
                </ScrollView>
              ) : null}
              <View style={styles.actions}>
                <View style={{ flex: 1 }}>
                  <Button label="Fermer" variant="ghost" onPress={closeOrganize} />
                </View>
                <View style={{ flex: 1 }}>
                  <Button label="Proposer" onPress={runOrganize} loading={organizeLoading} />
                </View>
              </View>
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
      {item.linked_chapter_id ? (
        <Ionicons name="book-outline" size={15} color={Palette.textMuted} />
      ) : null}
      {item.recurrence !== 'none' ? (
        <Ionicons name="repeat" size={16} color={Palette.textMuted} />
      ) : null}
      <Ionicons name="chevron-forward" size={18} color={Palette.textMuted} />
    </Tappable>
  );
}

function TaskRow({
  item,
  onPress,
  onToggle,
}: {
  item: TaskItem;
  onPress: () => void;
  onToggle: () => void;
}) {
  const cat = categoryOf(item.category);
  return (
    <Tappable style={styles.taskRow} onPress={onPress} haptic={false}>
      <Pressable hitSlop={8} onPress={onToggle} accessibilityLabel="Terminer la tâche">
        <View style={[styles.checkbox, item.done && { backgroundColor: cat.color, borderColor: cat.color }]}>
          {item.done ? <Ionicons name="checkmark" size={15} color="#06130C" /> : null}
        </View>
      </Pressable>
      <View style={{ flex: 1 }}>
        <Text
          variant="bodyStrong"
          numberOfLines={2}
          color={item.done ? Palette.textMuted : Palette.text}
          style={item.done ? { textDecorationLine: 'line-through' } : undefined}>
          {item.title}
        </Text>
        <Text variant="small" color={Palette.textMuted}>
          {cat.label}
        </Text>
      </View>
      <View style={[styles.catDot, { backgroundColor: cat.color }]} />
    </Tappable>
  );
}

function DayView({
  events,
  tasks,
  onAdd,
  onPress,
  onPressTask,
  onToggleTask,
}: {
  events: EventItem[];
  tasks: TaskItem[];
  onAdd: () => void;
  onPress: (e: EventItem) => void;
  onPressTask: (t: TaskItem) => void;
  onToggleTask: (t: TaskItem) => void;
}) {
  if (events.length === 0 && tasks.length === 0) {
    return (
      <EmptyState
        icon="sunny-outline"
        eyebrow="Ta journée"
        title="Journée libre"
        subtitle="Rien de prévu ce jour. Ajoute une activité ou une tâche pour organiser ta journée.">
        <Button label="Ajouter" onPress={onAdd} />
      </EmptyState>
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
      {events.map((e) => (
        <EventRow key={`${e.id}-${e.starts_at}`} item={e} onPress={() => onPress(e)} />
      ))}
      {tasks.length > 0 ? (
        <>
          <Text variant="small" color={Palette.textMuted} style={styles.sectionLabel}>
            TÂCHES
          </Text>
          {tasks.map((t) => (
            <TaskRow key={t.id} item={t} onPress={() => onPressTask(t)} onToggle={() => onToggleTask(t)} />
          ))}
        </>
      ) : null}
    </ScrollView>
  );
}

function WeekView({
  weekStart,
  byDay,
  tasksByDay,
  today,
  onPressEvent,
  onPressTask,
  onToggleTask,
  onAddDay,
}: {
  weekStart: Date;
  byDay: Map<string, EventItem[]>;
  tasksByDay: Map<string, TaskItem[]>;
  today: Date;
  onPressEvent: (e: EventItem) => void;
  onPressTask: (t: TaskItem) => void;
  onToggleTask: (t: TaskItem) => void;
  onAddDay: (d: Date) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <ScrollView contentContainerStyle={styles.weekBody} showsVerticalScrollIndicator={false}>
      {days.map((d) => {
        const evs = byDay.get(dateKey(d)) ?? [];
        const tks = tasksByDay.get(ymd(d)) ?? [];
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
            {evs.length === 0 && tks.length === 0 ? (
              <Text variant="small" color={Palette.textMuted} style={{ paddingVertical: Spacing.xs }}>
                Libre
              </Text>
            ) : (
              <>
                {evs.map((e) => {
                  const cat = categoryOf(e.category);
                  return (
                    <Tappable key={`${e.id}-${e.starts_at}`} style={styles.weekEvent} onPress={() => onPressEvent(e)} haptic={false}>
                      <View style={[styles.weekDot, { backgroundColor: cat.color }]} />
                      <Text variant="small" color={Palette.textSecondary} style={{ width: 46 }}>
                        {e.all_day ? 'Jour' : fmtTime(e.starts_at)}
                      </Text>
                      <Text variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                        {e.title}
                      </Text>
                    </Tappable>
                  );
                })}
                {tks.map((t) => {
                  const cat = categoryOf(t.category);
                  return (
                    <Tappable key={t.id} style={styles.weekEvent} onPress={() => onPressTask(t)} haptic={false}>
                      <Pressable hitSlop={8} onPress={() => onToggleTask(t)} accessibilityLabel="Terminer la tâche">
                        <View style={[styles.weekCheck, t.done && { backgroundColor: cat.color, borderColor: cat.color }]}>
                          {t.done ? <Ionicons name="checkmark" size={12} color="#06130C" /> : null}
                        </View>
                      </Pressable>
                      <Text
                        variant="bodyStrong"
                        numberOfLines={1}
                        color={t.done ? Palette.textMuted : Palette.text}
                        style={[{ flex: 1 }, t.done ? { textDecorationLine: 'line-through' } : null]}>
                        {t.title}
                      </Text>
                    </Tappable>
                  );
                })}
              </>
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
  tasksByDay,
  today,
  onPickDay,
}: {
  month: Date;
  byDay: Map<string, EventItem[]>;
  tasksByDay: Map<string, TaskItem[]>;
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
          const has =
            (byDay.get(dateKey(d)) ?? []).length > 0 || (tasksByDay.get(ymd(d)) ?? []).length > 0;
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
  sectionLabel: { marginTop: Spacing.md, marginBottom: Spacing.xs, marginLeft: Spacing.xs, letterSpacing: 0.6 },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    backgroundColor: Palette.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: Palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Palette.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
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
  // Page plein écran (formulaires)
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
  pageBody: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.xl },
  pageFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Palette.border,
    backgroundColor: Palette.background,
  },
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
  linkOpen: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  proposal: {
    maxHeight: 220,
    backgroundColor: Palette.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
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
  actions: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.lg },
});
