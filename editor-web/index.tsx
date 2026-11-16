// Entrée web de l'éditeur TenTap sur-mesure : kit par défaut + extensions Table.
// Bundlée en HTML autonome (customSource) et chargée par l'app dans la WebView.
// Build : node scripts/build-editor.mjs  ->  src/editor-web/editorHtml.ts
import { createRoot } from 'react-dom/client';
import { EditorContent, useTenTap, TenTapStartKit } from '@10play/tentap-editor/web';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableHeader } from '@tiptap/extension-table-header';
import { TableCell } from '@tiptap/extension-table-cell';

function EditorWeb() {
  const editor = useTenTap({
    bridges: TenTapStartKit,
    tiptapOptions: {
      extensions: [Table.configure({ resizable: false }), TableRow, TableHeader, TableCell],
    },
  });
  return <EditorContent editor={editor} />;
}

const el = document.getElementById('root');
if (el) createRoot(el).render(<EditorWeb />);
