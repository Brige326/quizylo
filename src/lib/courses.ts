import { supabase } from './supabase';

/**
 * Données de « Mes cours » — bibliothèque personnelle de l'étudiant.
 * MC-1 : les matières. (Chapitres, documents et contenus générés arrivent aux séances suivantes.)
 */
export type Subject = {
  id: string;
  user_id: string;
  name: string;
  color: string;
  position: number;
  created_at: string;
  updated_at: string;
};

// Palette sobre pour les cartes de matières (cohérente avec l'identité Quizylo).
export const SUBJECT_COLORS = [
  '#22E07B',
  '#5B8CFF',
  '#FF4D8D',
  '#A855F7',
  '#F5B301',
  '#2DD4BF',
  '#FF8A3D',
  '#38BDF8',
];

export async function listSubjects(userId: string): Promise<Subject[]> {
  const { data, error } = await supabase
    .from('subjects')
    .select('*')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Subject[];
}

export async function createSubject(
  userId: string,
  name: string,
  color: string,
  position: number,
): Promise<Subject> {
  const { data, error } = await supabase
    .from('subjects')
    .insert({ user_id: userId, name: name.trim(), color, position })
    .select('*')
    .single();
  if (error) throw error;
  return data as Subject;
}

export async function renameSubject(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('subjects')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function updateSubjectColor(id: string, color: string): Promise<void> {
  const { error } = await supabase
    .from('subjects')
    .update({ color, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteSubject(id: string): Promise<void> {
  const { error } = await supabase.from('subjects').delete().eq('id', id);
  if (error) throw error;
}
