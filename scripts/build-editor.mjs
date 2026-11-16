// Build de l'éditeur web TenTap sur-mesure.
// Bundle editor-web/index.tsx -> HTML autonome -> src/editor-web/editorHtml.ts
// Lancer : node scripts/build-editor.mjs
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [resolve(root, 'editor-web/index.tsx')],
  bundle: true,
  minify: true,
  format: 'iife',
  jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  write: false,
  logLevel: 'warning',
});

const js = result.outputFiles[0].text;

// Styles minimes : bordures de tableau (le reste du thème vient du runtime TenTap).
const css = `
table{border-collapse:collapse;width:100%;margin:12px 0;table-layout:fixed}
td,th{border:1px solid rgba(128,128,128,0.45);padding:8px 10px;vertical-align:top}
th{font-weight:700;text-align:left;background:rgba(128,128,128,0.12)}
.tableWrapper{overflow-x:auto}
img{max-width:100%;height:auto;border-radius:8px}
`.trim();

const html =
  '<!doctype html><html><head><meta charset="utf-8">' +
  '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">' +
  '<!--TENTAP_BOOT-->' +
  `<style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`;

const outDir = resolve(root, 'src/editor-web');
mkdirSync(outDir, { recursive: true });
const ts =
  '// FICHIER GÉNÉRÉ — ne pas éditer à la main.\n' +
  '// Source : editor-web/index.tsx — régénérer avec `node scripts/build-editor.mjs`.\n' +
  `export const customEditorHtml = ${JSON.stringify(html)};\n`;
writeFileSync(resolve(outDir, 'editorHtml.ts'), ts);

console.log(`editorHtml.ts généré (${(html.length / 1024).toFixed(0)} Ko).`);
