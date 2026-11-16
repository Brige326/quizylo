// Tracé d'une fonction y = f(x) en SVG (inséré ensuite comme image dans la leçon).
// Calcul côté natif, rendu auto-contenu : privé par défaut, aucune dépendance réseau.
import { compile } from 'mathjs';

export type PlotOptions = {
  xMin?: number;
  xMax?: number;
  width?: number;
  height?: number;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/**
 * Génère un SVG traçant `expr` (ex. "x^2", "sin(x)", "1/x").
 * Lève une erreur si l'expression est invalide (à attraper par l'appelant).
 */
export function functionPlotSvg(expr: string, opts: PlotOptions = {}): string {
  const xMin = opts.xMin ?? -6;
  const xMax = opts.xMax ?? 6;
  const W = opts.width ?? 640;
  const H = opts.height ?? 380;
  const pad = 34;

  const code = compile(expr); // throw si invalide

  const N = 256;
  const pts: { x: number; y: number | null }[] = [];
  for (let i = 0; i <= N; i++) {
    const x = xMin + ((xMax - xMin) * i) / N;
    let y: number | null = null;
    try {
      const v = code.evaluate({ x });
      if (typeof v === 'number' && Number.isFinite(v) && Math.abs(v) < 1e5) y = v;
    } catch {
      y = null;
    }
    pts.push({ x, y });
  }

  const ysFinite = pts.map((p) => p.y).filter((v): v is number => v !== null);
  let yMin = ysFinite.length ? Math.min(...ysFinite) : -1;
  let yMax = ysFinite.length ? Math.max(...ysFinite) : 1;
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  // Garde-fou contre les asymptotes : borne la fenêtre verticale.
  const span = yMax - yMin;
  yMin -= span * 0.08;
  yMax += span * 0.08;

  const sx = (x: number) => pad + ((x - xMin) / (xMax - xMin)) * (W - 2 * pad);
  const sy = (y: number) => H - pad - ((y - yMin) / (yMax - yMin)) * (H - 2 * pad);

  // Chemin de la courbe, coupé aux discontinuités.
  let d = '';
  let pen = false;
  for (const p of pts) {
    if (p.y === null) {
      pen = false;
      continue;
    }
    const X = sx(p.x).toFixed(1);
    const Y = sy(p.y).toFixed(1);
    d += `${pen ? 'L' : 'M'}${X} ${Y} `;
    pen = true;
  }

  // Axes (si 0 est dans la fenêtre).
  const axisColor = 'rgba(255,255,255,0.22)';
  let axes = '';
  if (xMin < 0 && xMax > 0) {
    const X = sx(0).toFixed(1);
    axes += `<line x1="${X}" y1="${pad}" x2="${X}" y2="${H - pad}" stroke="${axisColor}" stroke-width="1"/>`;
  }
  if (yMin < 0 && yMax > 0) {
    const Y = sy(0).toFixed(1);
    axes += `<line x1="${pad}" y1="${Y}" x2="${W - pad}" y2="${Y}" stroke="${axisColor}" stroke-width="1"/>`;
  }

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">` +
    `<rect x="0" y="0" width="${W}" height="${H}" rx="14" fill="#101712"/>` +
    `<rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="13" fill="none" stroke="rgba(255,255,255,0.12)"/>` +
    axes +
    `<path d="${d.trim()}" fill="none" stroke="#22E07B" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>` +
    `<text x="${pad}" y="26" fill="rgba(255,255,255,0.85)" font-family="sans-serif" font-size="18" font-weight="700">y = ${esc(
      expr,
    )}</text>` +
    `<text x="${W - pad}" y="${H - 12}" text-anchor="end" fill="rgba(255,255,255,0.45)" font-family="sans-serif" font-size="12">x ∈ [${xMin}, ${xMax}]</text>` +
    `</svg>`
  );
}
