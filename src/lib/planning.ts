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
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as EventItem;
}

export async function deleteEvent(id: string): Promise<void> {
  const { error } = await supabase.from('events').delete().eq('id', id);
  if (error) throw error;
}
