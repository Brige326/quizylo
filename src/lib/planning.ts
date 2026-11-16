import { supabase } from './supabase';

/**
 * Données du Planning (agenda personnel).
 * PL-1 : catégories par défaut + événements (vue Jour). Tâches, récurrence et rappels : séances suivantes.
 */
export type Category = { key: string; label: string; color: string };

export const CATEGORIES: Category[] = [
  { key: 'etudes', label: 'Études', color: '#5B8CFF' },
  { key: 'travail', label: 'Travail', color: '#F5B301' },
  { key: 'perso', label: 'Personnel', color: '#22E07B' },
  { key: 'sport', label: 'Sport', color: '#FF4D8D' },
  { key: 'rdv', label: 'Rendez-vous', color: '#A855F7' },
  { key: 'loisirs', label: 'Loisirs', color: '#2DD4BF' },
  { key: 'autres', label: 'Autres', color: '#9BA1AC' },
];

export function categoryOf(key: string): Category {
  return CATEGORIES.find((c) => c.key === key) ?? CATEGORIES[CATEGORIES.length - 1];
}

export type EventItem = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  reminder_minutes: number | null;
  notif_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Événements dont le début tombe dans [startISO, endISO). All-day d'abord, puis par heure. */
export async function listEventsBetween(
  userId: string,
  startISO: string,
  endISO: string,
): Promise<EventItem[]> {
  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('user_id', userId)
    .gte('starts_at', startISO)
    .lt('starts_at', endISO)
    .order('all_day', { ascending: false })
    .order('starts_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventItem[];
}

export async function createEvent(params: {
  userId: string;
  title: string;
  category: string;
  startsAt: string;
  endsAt?: string | null;
  allDay: boolean;
  description?: string | null;
  reminderMinutes?: number | null;
  notifId?: string | null;
}): Promise<EventItem> {
  const { data, error } = await supabase
    .from('events')
    .insert({
      user_id: params.userId,
      title: params.title.trim(),
      category: params.category,
      starts_at: params.startsAt,
      ends_at: params.endsAt ?? null,
      all_day: params.allDay,
      description: params.description ?? null,
      reminder_minutes: params.reminderMinutes ?? null,
      notif_id: params.notifId ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as EventItem;
}

export async function updateEvent(
  id: string,
  params: {
    title: string;
    category: string;
    startsAt: string;
    endsAt?: string | null;
    allDay: boolean;
    description?: string | null;
    reminderMinutes?: number | null;
    notifId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('events')
    .update({
      title: params.title.trim(),
      category: params.category,
      starts_at: params.startsAt,
      ends_at: params.endsAt ?? null,
      all_day: params.allDay,
      description: params.description ?? null,
      reminder_minutes: params.reminderMinutes ?? null,
      notif_id: params.notifId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Tâches (PL-4) ---------- */

export type TaskItem = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  due_date: string; // 'YYYY-MM-DD'
  done: boolean;
  description: string | null;
  reminder_minutes: number | null;
  notif_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Tâches dont l'échéance est dans [startYmd, endYmd) (dates au format 'YYYY-MM-DD'). */
export async function listTasksBetween(
  userId: string,
  startYmd: string,
  endYmd: string,
): Promise<TaskItem[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', userId)
    .gte('due_date', startYmd)
    .lt('due_date', endYmd)
    .order('done', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TaskItem[];
}

export async function createTask(params: {
  userId: string;
  title: string;
  category: string;
  dueDate: string;
  description?: string | null;
  reminderMinutes?: number | null;
  notifId?: string | null;
}): Promise<TaskItem> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: params.userId,
      title: params.title.trim(),
      category: params.category,
      due_date: params.dueDate,
      description: params.description ?? null,
      reminder_minutes: params.reminderMinutes ?? null,
      notif_id: params.notifId ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as TaskItem;
}

export async function updateTask(
  id: string,
  params: {
    title: string;
    category: string;
    dueDate: string;
    description?: string | null;
    reminderMinutes?: number | null;
    notifId?: string | null;
  },
): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({
      title: params.title.trim(),
      category: params.category,
      due_date: params.dueDate,
      description: params.description ?? null,
      reminder_minutes: params.reminderMinutes ?? null,
      notif_id: params.notifId ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const { error } = await supabase
    .from('tasks')
    .update({ done, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}
