// Convertisseur blocs -> document riche TipTap/ProseMirror.
// Utilisé pour migrer, sans perte, les leçons existantes (lessons.blocks)
// vers le futur champ lessons.content. Fonctions PURES et testables.
//
// La table `blocks` n'est jamais détruite : ce convertisseur ne fait que
// PRODUIRE un document `content` à partir des blocs. La bascule réelle
// interviendra en Phase 2.

import type { LessonBlock } from './courses';

/** Noeud ProseMirror minimal (sérialisable en JSON). */
export type TipTapMark = { type: string; attrs?: Record<string, unknown> };
export type TipTapNode = {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  text?: string;
};
export type TipTapDoc = { type: 'doc'; content: TipTapNode[] };

/** Document vide valide (ProseMirror exige au moins un paragraphe). */
export function emptyDoc(): TipTapDoc {
  return { type: 'doc', content: [{ type: 'paragraph' }] };
}

/** Un document est « vide » s'il n'a aucun texte ni média. */
export function isEmptyDoc(doc: TipTapDoc | null | undefined): boolean {
  if (!doc || !Array.isArray(doc.content)) return true;
  return !doc.content.some((n) => hasInk(n));
}

function hasInk(node: TipTapNode): boolean {
  if (node.type === 'image' || node.type === 'attachment') return true;
  if (typeof node.text === 'string' && node.text.trim().length > 0) return true;
  return (node.content ?? []).some(hasInk);
}

/** Construit les marques d'un run texte (couleur best-effort). */
function marksFor(block: LessonBlock): TipTapMark[] | undefined {
  if (!block.color) return undefined;
  return [{ type: 'textStyle', attrs: { color: block.color } }];
}

/**
 * Transforme un texte multi-lignes en noeuds inline d'UN paragraphe :
 * les sauts de ligne simples deviennent des `hardBreak`.
 */
function inlineRuns(text: string, marks?: TipTapMark[]): TipTapNode[] {
  const out: TipTapNode[] = [];
  const parts = text.split('\n');
  parts.forEach((part, i) => {
    if (i > 0) out.push({ type: 'hardBreak' });
    if (part.length > 0) {
      const node: TipTapNode = { type: 'text', text: part };
      if (marks) node.marks = marks;
      out.push(node);
    }
  });
  return out;
}

/** Bloc texte -> un ou plusieurs paragraphes (séparés par les lignes vides). */
function textParagraphs(block: LessonBlock): TipTapNode[] {
  const raw = block.text ?? '';
  if (raw.trim().length === 0) return [{ type: 'paragraph' }];
  const marks = marksFor(block);
  const attrs = block.font && block.font !== 'default' ? { font: block.font } : undefined;
  // Les lignes vides séparent les paragraphes ; les sauts simples -> hardBreak.
  return raw
    .split(/\n{2,}/)
    .map<TipTapNode>((chunk) => {
      const para: TipTapNode = { type: 'paragraph', content: inlineRuns(chunk, marks) };
      if (attrs) para.attrs = attrs;
      return para;
    });
}

/** Bloc titre / sous-titre -> heading (niveau 1 ou 2). */
function headingNode(block: LessonBlock, level: 1 | 2): TipTapNode {
  const text = (block.text ?? '').replace(/\n+/g, ' ').trim();
  const attrs: Record<string, unknown> = { level };
  if (block.font && block.font !== 'default') attrs.font = block.font;
  const node: TipTapNode = { type: 'heading', attrs };
  if (text.length > 0) {
    const run: TipTapNode = { type: 'text', text };
    const marks = marksFor(block);
    if (marks) run.marks = marks;
    node.content = [run];
  }
  return node;
}

/** Bloc image -> noeud image (référence le chemin Storage). */
function imageNode(block: LessonBlock): TipTapNode {
  return {
    type: 'image',
    attrs: { path: block.path ?? null, name: block.name ?? null, mime: block.mime ?? null },
  };
}

/** Bloc pdf -> noeud pièce jointe (rendu/visionneuse gérés plus tard). */
function attachmentNode(block: LessonBlock): TipTapNode {
  return {
    type: 'attachment',
    attrs: {
      kind: 'pdf',
      path: block.path ?? null,
      name: block.name ?? null,
      mime: block.mime ?? null,
    },
  };
}

/** Convertit un tableau de blocs en document TipTap. Jamais vide. */
export function blocksToDoc(blocks: LessonBlock[] | null | undefined): TipTapDoc {
  if (!blocks || blocks.length === 0) return emptyDoc();

  const content: TipTapNode[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'heading':
        content.push(headingNode(block, 1));
        break;
      case 'subheading':
        content.push(headingNode(block, 2));
        break;
      case 'text':
        content.push(...textParagraphs(block));
        break;
      case 'image':
        content.push(imageNode(block));
        break;
      case 'pdf':
        content.push(attachmentNode(block));
        break;
      default:
        // Type inconnu : on ne perd rien, on ignore proprement.
        break;
    }
  }

  if (content.length === 0) return emptyDoc();
  return { type: 'doc', content };
}
