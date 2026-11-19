// "Exportar": draws the active chart into a <canvas> in the browser and downloads a PNG.
// No servers involved: the SVG is cloned with resolved styles, fonts are inlined, then rasterised.
import { periodTitle, segmentLabel } from '../data/selectors';
import { store } from './store';

const STYLE_PROPS = [
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'opacity',
  'font-family',
  'font-size',
  'font-weight',
  'paint-order',
  'text-anchor',
  'visibility',
  'display',
] as const;

let fontCSS: Promise<string> | null = null;

/** Inline the latin Barlow faces as data URLs so text keeps its typeface inside the image. */
function embeddedFonts(): Promise<string> {
  fontCSS ??= (async () => {
    const rules: CSSFontFaceRule[] = [];
    for (const sheet of [...document.styleSheets]) {
      let list: CSSRuleList;
      try {
        list = sheet.cssRules;
      } catch {
        continue;
      }
      for (const rule of [...list]) {
        if (rule instanceof CSSFontFaceRule && /Barlow/.test(rule.style.getPropertyValue('font-family'))) rules.push(rule);
      }
    }
    const latin = rules.filter((r) => /latin-\d/.test(r.cssText) && !/latin-ext/.test(r.cssText));
    const out = await Promise.all(
      latin.map(async (r) => {
        const url = /url\("?([^")]+\.woff2)"?\)/.exec(r.cssText)?.[1];
        if (!url) return '';
        const blob = await (await fetch(url)).blob();
        const data = await new Promise<string>((res) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.readAsDataURL(blob);
        });
        return `@font-face{font-family:${r.style.getPropertyValue('font-family')};font-weight:${r.style.getPropertyValue('font-weight')};src:url(${data}) format('woff2');}`;
      }),
    );
    return out.join('');
  })();
  return fontCSS;
}

function inlineStyles(source: Element, target: Element): void {
  const cs = getComputedStyle(source);
  const style = STYLE_PROPS.map((p) => `${p}:${cs.getPropertyValue(p)}`).join(';');
  target.setAttribute('style', style);
  const a = source.children;
  const b = target.children;
  for (let i = 0; i < a.length; i++) {
    const s = a[i];
    const t = b[i];
    if (s && t) inlineStyles(s, t);
  }
}

const cssVar = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

export async function exportChart(svg: Element, title: string, slug: string): Promise<void> {
  const rect = svg.getBoundingClientRect();
  const scale = 2;
  const pad = 56;
  const headH = 120;
  const footH = 56;
  const w = Math.round(rect.width);
  const h = Math.round(rect.height);

  const clone = svg.cloneNode(true) as SVGSVGElement;
  inlineStyles(svg, clone);
  clone.setAttribute('width', String(w));
  clone.setAttribute('height', String(h));
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
  style.textContent = await embeddedFonts();
  clone.prepend(style);

  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }));
  const img = new Image();
  img.decoding = 'async';
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error('No se pudo rasterizar el gráfico'));
    img.src = url;
  });

  const canvas = document.createElement('canvas');
  canvas.width = (w + pad * 2) * scale;
  canvas.height = (h + headH + footH + pad) * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(scale, scale);
  ctx.fillStyle = cssVar('--bg');
  ctx.fillRect(0, 0, w + pad * 2, h + headH + footH + pad);

  const { period } = store.get();
  ctx.fillStyle = cssVar('--muted');
  ctx.font = '600 18px "Barlow Condensed", sans-serif';
  ctx.fillText(`MAYORISTA CENTRAL · ${periodTitle(period)} · ${segmentLabel(store.get())}`, pad, pad);
  ctx.fillStyle = cssVar('--ink');
  ctx.font = '700 44px "Barlow Condensed", sans-serif';
  ctx.fillText(title, pad, pad + 50);
  ctx.drawImage(img, pad, headH, w, h);

  // Footer with the always-visible "Demo" mark.
  const footY = headH + h + pad * 0.5 + 24;
  ctx.fillStyle = cssVar('--accent');
  ctx.fillRect(pad, footY - 18, 62, 26);
  ctx.fillStyle = cssVar('--accent-ink');
  ctx.font = '700 16px "Barlow Condensed", sans-serif';
  ctx.fillText('DEMO', pad + 12, footY + 1);
  ctx.fillStyle = cssVar('--muted');
  ctx.font = '400 15px Barlow, sans-serif';
  ctx.fillText('Marca y datos ficticios · generado en el navegador', pad + 76, footY);
  URL.revokeObjectURL(url);

  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/png'));
  if (!blob) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `mayorista-central-${slug}.png`;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
