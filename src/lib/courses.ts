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

/* ---------- Recherche interne (MC-5) ---------- */

export type CourseSearchResult =
  | { type: 'subject'; id: string; title: string; color: string }
  | { type: 'chapter'; id: string; title: string; subjectId: string; color: string }
  | {
      type: 'document';
      id: string;
      title: string;
      kind: DocKind;
      chapterId: string | null;
      chapterName: string;
      subjectId: string;
      color: string;
    }
  | { type: 'generated'; id: string; title: string; kind: GenKind };

/** Recherche interne couvrant matières, chapitres, documents et contenus générés de l'utilisateur. */
export async function searchCourses(userId: string, query: string): Promise<CourseSearchResult[]> {
  const raw = query.trim();
  const q = raw.toLowerCase();
  if (!q) return [];

  const [subjectsRes, chaptersRes, docsRes, genRes] = await Promise.all([
    supabase.from('subjects').select('id,name,color').eq('user_id', userId),
    supabase.from('chapters').select('id,name,subject_id').eq('user_id', userId),
    supabase.from('documents').select('id,title,kind,chapter_id,subject_id').eq('user_id', userId).ilike('title', `%${raw}%`),
    supabase.from('generated_content').select('id,title,kind').eq('user_id', userId).ilike('title', `%${raw}%`),
  ]);

  const subjects = (subjectsRes.data ?? []) as { id: string; name: string; color: string }[];
  const chapters = (chaptersRes.data ?? []) as { id: string; name: string; subject_id: string }[];
  const docRows = (docsRes.data ?? []) as {
    id: string;
    title: string;
    kind: DocKind;
    chapter_id: string | null;
    subject_id: string;
  }[];
  const genRows = (genRes.data ?? []) as { id: string; title: string; kind: GenKind }[];

  const subjMap = new Map(subjects.map((s) => [s.id, s]));
  const chMap = new Map(chapters.map((c) => [c.id, c]));
  const DEFAULT_COLOR = '#22E07B';
  const results: CourseSearchResult[] = [];

  subjects
    .filter((s) => s.name.toLowerCase().includes(q))
    .forEach((s) => results.push({ type: 'subject', id: s.id, title: s.name, color: s.color }));

  chapters
    .filter((c) => c.name.toLowerCase().includes(q))
    .forEach((c) =>
      results.push({
        type: 'chapter',
        id: c.id,
        title: c.name,
        subjectId: c.subject_id,
        color: subjMap.get(c.subject_id)?.color ?? DEFAULT_COLOR,
      }),
    );

  docRows.forEach((d) =>
    results.push({
      type: 'document',
      id: d.id,
      title: d.title,
      kind: d.kind,
      chapterId: d.chapter_id,
      chapterName: d.chapter_id ? chMap.get(d.chapter_id)?.name ?? '' : '',
      subjectId: d.subject_id,
      color: subjMap.get(d.subject_id)?.color ?? DEFAULT_COLOR,
    }),
  );

  genRows.forEach((g) => results.push({ type: 'generated', id: g.id, title: g.title, kind: g.kind }));

  return results;
}

/* ---------- Contenus générés par IA (MC-4) ---------- */

export type GenKind = 'quiz' | 'fiche' | 'flashcards' | 'resume' | 'examen';

export type QuizQuestion = { q: string; choices: string[]; answer: number; explanation?: string };
export type GenPayload =
  | { questions: QuizQuestion[] }
  | { cards: { front: string; back: string }[] }
  | { sections: { heading: string; points: string[] }[] }
  | { text: string }
  | Record<string, unknown>;

export type GenItem = {
  id: string;
  user_id: string;
  subject_id: string;
  chapter_id: string | null;
  source_document_id: string | null;
  kind: GenKind;
  title: string;
  payload: GenPayload;
  created_at: string;
  updated_at: string;
};

export type GenerateResult = {
  configured: boolean;
  kind?: GenKind;
  title?: string;
  payload?: GenPayload;
  error?: string;
};

/** Appelle l'edge function de génération (LLM). Renvoie configured:false si aucune clé n'est en place. */
export async function generateContent(
  kind: GenKind,
  context: string,
  title?: string,
): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke('generate-content', {
    body: { kind, context, title },
  });
  if (error) throw error;
  return data as GenerateResult;
}

export async function saveGeneratedContent(params: {
  userId: string;
  subjectId: string;
  chapterId: string;
  sourceDocumentId?: string | null;
  kind: GenKind;
  title: string;
  payload: GenPayload;
}): Promise<GenItem> {
  const { data, error } = await supabase
    .from('generated_content')
    .insert({
      user_id: params.userId,
      subject_id: params.subjectId,
      chapter_id: params.chapterId,
      source_document_id: params.sourceDocumentId ?? null,
      kind: params.kind,
      title: params.title,
      payload: params.payload,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as GenItem;
}

export async function listGeneratedContent(chapterId: string): Promise<GenItem[]> {
  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GenItem[];
}

export async function getGeneratedContent(id: string): Promise<GenItem | null> {
  const { data, error } = await supabase.from('generated_content').select('*').eq('id', id).single();
  if (error) throw error;
  return (data as GenItem) ?? null;
}

export async function renameGeneratedContent(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('generated_content')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteGeneratedContent(id: string): Promise<void> {
  const { error } = await supabase.from('generated_content').delete().eq('id', id);
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
