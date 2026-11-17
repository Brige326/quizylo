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
  /** Nombre de chapitres de la matière (rempli par listSubjects). */
  chapter_count?: number;
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
    .select('*, chapters(count)')
    .eq('user_id', userId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => {
    const { chapters, ...rest } = row;
    return {
      ...rest,
      chapter_count: Array.isArray(chapters) && chapters[0] ? chapters[0].count ?? 0 : 0,
    } as Subject;
  });
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

/* ---------- Leçons (chapitres → leçons) ---------- */

export type LessonBlockType = 'heading' | 'subheading' | 'text' | 'image' | 'pdf';

export type LessonFont = 'default' | 'serif' | 'hand';

export type LessonBlock = {
  id: string;
  type: LessonBlockType;
  /** Blocs texte (titre / sous-titre / texte). */
  text?: string;
  /** Couleur du texte (blocs titre / sous-titre / texte). Absent = couleur par défaut. */
  color?: string;
  /** Police du bloc texte. Absent = police standard du système. */
  font?: LessonFont;
  /** Blocs médias (image / pdf) : chemin Storage privé. */
  path?: string;
  /** Nom d'origine du fichier (surtout pour les PDF). */
  name?: string;
  mime?: string;
};

export const TEXT_BLOCK_TYPES: LessonBlockType[] = ['heading', 'subheading', 'text'];
export const isMediaBlock = (t: LessonBlockType) => t === 'image' || t === 'pdf';

/** Polices proposées pour les blocs texte d'une leçon. */
export const LESSON_FONTS: { key: LessonFont; label: string }[] = [
  { key: 'default', label: 'Standard' },
  { key: 'serif', label: 'Serif' },
  { key: 'hand', label: 'Manuscrite' },
];

/** Couleurs proposées pour les titres / sous-titres / texte d'une leçon. */
export const LESSON_TEXT_COLORS = [
  '#FFFFFF',
  '#22E07B',
  '#5B8CFF',
  '#FF4D8D',
  '#A855F7',
  '#F5B301',
  '#2DD4BF',
  '#FF8A3D',
];

export type Lesson = {
  id: string;
  user_id: string;
  subject_id: string;
  chapter_id: string;
  title: string;
  position: number;
  blocks: LessonBlock[];
  /** Note texte simple de la leçon (nouveau modèle). */
  note: string | null;
  created_at: string;
  updated_at: string;
};

/** Type de ressource attachée à une leçon. */
export type LessonAttachmentKind = 'image' | 'pdf' | 'document' | 'audio' | 'other';

export type LessonAttachment = {
  id: string;
  lesson_id: string;
  user_id: string;
  kind: LessonAttachmentKind;
  storage_path: string;
  mime: string | null;
  name: string | null;
  size_bytes: number | null;
  favorite: boolean;
  position: number;
  created_at: string;
};

export async function listLessons(chapterId: string): Promise<Lesson[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as any[]).map((r) => ({
    ...r,
    blocks: r.blocks ?? [],
    note: r.note ?? null,
  })) as Lesson[];
}

export async function getLesson(id: string): Promise<Lesson | null> {
  const { data, error } = await supabase.from('lessons').select('*').eq('id', id).single();
  if (error) {
    if ((error as any).code === 'PGRST116') return null;
    throw error;
  }
  return { ...(data as any), blocks: (data as any).blocks ?? [], note: (data as any).note ?? null } as Lesson;
}

/** Enregistre la note texte simple de la leçon. */
export async function saveLessonNote(id: string, note: string): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .update({ note, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

// --- Ressources d'une leçon (lesson_attachments) ---

export async function listLessonAttachments(lessonId: string): Promise<LessonAttachment[]> {
  const { data, error } = await supabase
    .from('lesson_attachments')
    .select('*')
    .eq('lesson_id', lessonId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LessonAttachment[];
}

/** Téléverse un fichier local et crée la ressource associée. */
export async function uploadAndAddAttachment(params: {
  userId: string;
  lessonId: string;
  kind: LessonAttachmentKind;
  uri: string;
  name?: string;
  mime?: string;
  sizeBytes?: number;
}): Promise<LessonAttachment> {
  const { userId, lessonId, kind, uri, name, mime, sizeBytes } = params;
  const buffer = await new File(uri).arrayBuffer();
  const ext = extFor(name, mime);
  const path = `${userId}/lessons/${lessonId}/${uid()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(path, buffer, {
    contentType: mime ?? 'application/octet-stream',
    upsert: false,
  });
  if (upErr) throw upErr;

  const { data, error } = await supabase
    .from('lesson_attachments')
    .insert({
      lesson_id: lessonId,
      user_id: userId,
      kind,
      storage_path: path,
      mime: mime ?? null,
      name: name ?? null,
      size_bytes: sizeBytes ?? null,
    })
    .select('*')
    .single();
  if (error) {
    // On évite un fichier orphelin si l'insertion échoue.
    await supabase.storage.from(DOCS_BUCKET).remove([path]).catch(() => {});
    throw error;
  }
  return data as LessonAttachment;
}

export async function removeLessonAttachment(att: LessonAttachment): Promise<void> {
  const { error } = await supabase.from('lesson_attachments').delete().eq('id', att.id);
  if (error) throw error;
  await supabase.storage.from(DOCS_BUCKET).remove([att.storage_path]).catch(() => {});
}

export async function renameLessonAttachment(id: string, name: string): Promise<void> {
  const { error } = await supabase.from('lesson_attachments').update({ name }).eq('id', id);
  if (error) throw error;
}

export async function setAttachmentFavorite(id: string, favorite: boolean): Promise<void> {
  const { error } = await supabase.from('lesson_attachments').update({ favorite }).eq('id', id);
  if (error) throw error;
}

export async function saveLessonBlocks(id: string, blocks: LessonBlock[]): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .update({ blocks, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function createLesson(
  userId: string,
  subjectId: string,
  chapterId: string,
  title: string,
  position: number,
): Promise<Lesson> {
  const { data, error } = await supabase
    .from('lessons')
    .insert({ user_id: userId, subject_id: subjectId, chapter_id: chapterId, title: title.trim(), position })
    .select('*')
    .single();
  if (error) throw error;
  return data as Lesson;
}

export async function renameLesson(id: string, title: string): Promise<void> {
  const { error } = await supabase
    .from('lessons')
    .update({ title: title.trim(), updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteLesson(id: string): Promise<void> {
  const { error } = await supabase.from('lessons').delete().eq('id', id);
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

/**
 * Téléverse un document pour un PARCOURS (image ou PDF) dans le bucket privé, sans créer de
 * ligne `documents` ni exiger de chapitre. Renvoie le chemin Storage à passer à la génération.
 */
export async function uploadParcoursDocument(params: {
  userId: string;
  kind: 'image' | 'pdf';
  uri: string;
  name?: string;
  mime?: string;
}): Promise<{ path: string }> {
  const { userId, kind, uri, name, mime } = params;
  const buffer = await new File(uri).arrayBuffer();
  const ext = extFor(name, mime);
  const path = `${userId}/parcours/${uid()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(path, buffer, {
    contentType: mime ?? (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    upsert: false,
  });
  if (upErr) throw upErr;
  return { path };
}

/** Tous les documents (images + PDF) d'une matière, tous chapitres confondus. */
export async function listSubjectDocuments(subjectId: string): Promise<DocItem[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .eq('subject_id', subjectId)
    .in('kind', ['pdf', 'image'])
    .not('storage_path', 'is', null)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as DocItem[];
}

export async function signedUrlFor(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from(DOCS_BUCKET).createSignedUrl(path, 3600);
  if (error) throw error;
  return data.signedUrl;
}

/**
 * Téléverse un média de leçon (image ou PDF) dans le bucket privé et renvoie son
 * chemin Storage. Aucune ligne `documents` : le média vit dans les blocs de la leçon.
 */
export async function uploadLessonAsset(params: {
  userId: string;
  lessonId: string;
  kind: 'image' | 'pdf';
  uri: string;
  name?: string;
  mime?: string;
}): Promise<{ path: string }> {
  const { userId, lessonId, kind, uri, name, mime } = params;
  const buffer = await new File(uri).arrayBuffer();
  const ext = extFor(name, mime);
  const path = `${userId}/lessons/${lessonId}/${uid()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(path, buffer, {
    contentType: mime ?? (kind === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    upsert: false,
  });
  if (upErr) throw upErr;
  return { path };
}

export async function removeLessonAsset(path: string): Promise<void> {
  await supabase.storage.from(DOCS_BUCKET).remove([path]);
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
export type Difficulty = 'facile' | 'moyen' | 'difficile';
export type Level = 'college' | 'lycee' | 'superieur';

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
  difficulty: Difficulty | null;
  level: Level | null;
  summary: string | null;
  created_at: string;
  updated_at: string;
};

export type GenerateResult = {
  configured: boolean;
  kind?: GenKind;
  title?: string;
  payload?: GenPayload;
  difficulty?: Difficulty;
  level?: Level;
  summary?: string | null;
  meta?: { files: number; skipped: number };
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

/**
 * Génération « parcours » : l'IA lit directement les documents importés (images + PDF),
 * avec la matière, le format, la difficulté et le niveau. Renvoie un résumé explicatif
 * + le contenu. configured:false si aucune clé IA n'est en place.
 */
export async function generateFromDocuments(params: {
  kind: GenKind;
  difficulty: Difficulty;
  level: Level;
  subjectLabel?: string;
  attachments: { storage_path: string; mime: string | null; name: string }[];
  context?: string;
  title?: string;
}): Promise<GenerateResult> {
  const { data, error } = await supabase.functions.invoke('generate-content', {
    body: {
      kind: params.kind,
      difficulty: params.difficulty,
      level: params.level,
      subjectLabel: params.subjectLabel,
      attachments: params.attachments,
      context: params.context,
      title: params.title,
    },
  });
  if (error) throw error;
  return data as GenerateResult;
}

export async function saveGeneratedContent(params: {
  userId: string;
  subjectId: string;
  chapterId?: string | null;
  sourceDocumentId?: string | null;
  kind: GenKind;
  title: string;
  payload: GenPayload;
  difficulty?: Difficulty | null;
  level?: Level | null;
  summary?: string | null;
}): Promise<GenItem> {
  const { data, error } = await supabase
    .from('generated_content')
    .insert({
      user_id: params.userId,
      subject_id: params.subjectId,
      chapter_id: params.chapterId ?? null,
      source_document_id: params.sourceDocumentId ?? null,
      kind: params.kind,
      title: params.title,
      payload: params.payload,
      difficulty: params.difficulty ?? null,
      level: params.level ?? null,
      summary: params.summary ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as GenItem;
}

/** Tous les parcours générés par l'utilisateur, du plus récent au plus ancien. */
export async function listUserGeneratedContent(userId: string): Promise<GenItem[]> {
  const { data, error } = await supabase
    .from('generated_content')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as GenItem[];
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
