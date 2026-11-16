import { File } from 'expo-file-system';

import { supabase } from './supabase';

const DOCS_BUCKET = 'documents';

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

/* ---------- Chapitres (MC-2) ---------- */

export type Chapter = {
  id: string;
  subject_id: string;
  user_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
};

export async function listChapters(subjectId: string): Promise<Chapter[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('subject_id', subjectId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as Chapter[];
}

export async function createChapter(
  userId: string,
  subjectId: string,
  name: string,
  position: number,
): Promise<Chapter> {
  const { data, error } = await supabase
    .from('chapters')
    .insert({ user_id: userId, subject_id: subjectId, name: name.trim(), position })
    .select('*')
    .single();
  if (error) throw error;
  return data as Chapter;
}

export async function renameChapter(id: string, name: string): Promise<void> {
  const { error } = await supabase
    .from('chapters')
    .update({ name: name.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteChapter(id: string): Promise<void> {
  const { error } = await supabase.from('chapters').delete().eq('id', id);
  if (error) throw error;
}

/* ---------- Documents (MC-3) ---------- */

export type DocKind = 'pdf' | 'image' | 'note' | 'text';

export type DocItem = {
  id: string;
  user_id: string;
  subject_id: string;
  chapter_id: string | null;
  kind: DocKind;
  title: string;
  storage_path: string | null;
  content: string | null;
  mime: string | null;
  size: number | null;
  created_at: string;
  updated_at: string;
};

function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function extFor(name: string | undefined, mime: string | undefined): string {
  const fromName = name && name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  if (fromName) return fromName.replace(/[^a-z0-9]/g, '');
  if (mime === 'application/pdf') return 'pdf';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/heic') return 'heic';
  if (mime === 'image/webp') return 'webp';
  return 'bin';
}

export async function listDocuments(chapterId: string): Promise<DocItem[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocItem[];
}

export async function createNote(
  userId: string,
  subjectId: string,
  chapterId: string,
  title: string,
  content: string,
): Promise<DocItem> {
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      subject_id: subjectId,
      chapter_id: chapterId,
      kind: 'note',
      title: title.trim() || 'Note',
      content,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DocItem;
}

export async function updateNoteContent(id: string, title: string, content: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ title: title.trim() || 'Note', content, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Importe un fichier local (PDF ou image) : lit ses octets, les téléverse dans le bucket privé,
 * puis enregistre la ligne `documents`. En cas d'échec d'insertion, on retire l'objet déjà téléversé.
 */
export async function uploadFileDocument(params: {
  userId: string;
  subjectId: string;
  chapterId: string;
  kind: 'pdf' | 'image';
  uri: string;
  name?: string;
  mime?: string;
  size?: number;
}): Promise<DocItem> {
  const { userId, subjectId, chapterId, kind, uri, name, mime, size } = params;
  const buffer = await new File(uri).arrayBuffer();
  const ext = extFor(name, mime);
  const path = `${userId}/${subjectId}/${uid()}.${ext}`;

  const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(path, buffer, {
    contentType: mime ?? (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    upsert: false,
  });
  if (upErr) throw upErr;

  const title = (name && name.replace(/\.[^.]+$/, '')) || (kind === 'pdf' ? 'Document' : 'Image');
  const { data, error } = await supabase
    .from('documents')
    .insert({
      user_id: userId,
      subject_id: subjectId,
      chapter_id: chapterId,
      kind,
      title,
      storage_path: path,
      mime: mime ?? null,
      size: size ?? null,
    })
    .select('*')
    .single();

  if (error) {
    // Nettoyage : l'octet est déjà en Storage mais la ligne a échoué.
    await supabase.storage.from(DOCS_BUCKET).remove([path]);
    throw error;
  }
  return data as DocItem;
}

export async function signedUrlFor(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

export async function renameDocument(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function moveDocument(id: string, chapterId: string): Promise<void> {
  const { error } = await supabase
    .from('documents')
    .update({ chapter_id: chapterId, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteDocument(doc: DocItem): Promise<void> {
  if (doc.storage_path) {
    await supabase.storage.from(DOCS_BUCKET).remove([doc.storage_path]);
  }
  const { error } = await supabase.from('documents').delete().eq('id', doc.id);
  if (error) throw error;
}
