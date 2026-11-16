// Entrée web de l'éditeur TenTap sur-mesure : kit par défaut + extensions Table.
// Bundlée en HTML autonome (customSource) et chargée par l'app dans la WebView.
// Build : node scripts/build-editor.mjs  ->  src/editor-web/editorHtml.ts
import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorContent, useTenTap, TenTapStartKit } from '@10play/tentap-editor/web';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';
import { Mathematics } from '@tiptap/extension-mathematics';
// Étend KaTeX avec \ce{...} pour les équations chimiques (même moteur que les maths).
import 'katex/contrib/mhchem';

function EditorWeb() {
  const editor = useTenTap({
    bridges: TenTapStartKit,
    tiptapOptions: {
      extensions: [
        Table.configure({ resizable: false }),
        TableRow,
        TableHeader,
        TableCell,
        Mathematics,
      ],
    },
  });
  // Expose l'éditeur pour piloter les tableaux depuis le natif via injectJS.
  useEffect(() => {
    (window as unknown as { __quizyloEditor?: unknown }).__quizyloEditor = editor ?? undefined;
  }, [editor]);
  return <EditorContent editor={editor} />;
}

const el = document.getElementById('root');
if (el) createRoot(el).render(<EditorWeb />);
