// Serves dist/ locally and captures screenshots with Playwright (no external services).
// Usage:
//   node scripts/capture.mjs poster                      -> public/poster.jpg (1600x900)
//   node scripts/capture.mjs shot <out.png> [w] [h] [query] [waitMs] [scrollTo] [jsToEvaluate]
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serve() {
  const server = createServer(async (req, res) => {
    try {
      let path = normalize(decodeURIComponent((req.url ?? '/').split('?')[0] ?? '/'));
      if (path.endsWith('/') || path.endsWith('\\')) path = join(path, 'index.html');
      let file = join(root, path);
      if (!file.startsWith(root)) throw new Error('forbidden');
      // Astro emits /route/index.html: serve directories through their index.
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      await stat(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end('not found');
    }
  });
  return new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server)));
}

const [mode = 'shot', ...args] = process.argv.slice(2);
const server = await serve();
const { port } = server.address();
const browser = await chromium.launch();
const errors = [];

try {
  if (mode === 'poster') {
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/?poster`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3500);
    await page.screenshot({ path: fileURLToPath(new URL('../public/poster.jpg', import.meta.url)), type: 'jpeg', quality: 88 });
    console.log('poster -> public/poster.jpg');
  } else if (mode === 'flow') {
    // Smoke test across views with client-side navigation, shortcuts and persisted state.
    const [out = 'flow'] = args;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    const step = async (name, fn, wait = 900) => {
      await fn();
      await page.waitForTimeout(wait);
      console.log('ok:', name, '→', new URL(page.url()).pathname, '|', await page.title());
    };
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await step('filter trimestre', () => page.click('[data-period="trimestre"]'));
    await step('nav clientes', () => page.click('.sidebar a[href="/clientes"]'));
    await step('search client', () => page.fill('[data-search]', 'perla'));
    await step('open client', () => page.click('[data-client-table] a.row-link'));
    await step('shortcut g o (pedidos)', async () => {
      await page.keyboard.press('g');
      await page.keyboard.press('o');
    }, 1400);
    await step('speed 10x', () => page.keyboard.press('0'), 3000);
    await step('palette → Lucía', async () => {
      await page.keyboard.press('Control+k');
      await page.waitForSelector('dialog.palette[open]');
      await page.keyboard.type('lucia');
      await page.waitForTimeout(200);
      await page.keyboard.press('Enter');
    }, 1400);
    await step('nav productos', () => page.click('.sidebar a[href="/productos"]'));
    await step('nav en vivo', () => page.click('.sidebar a[href="/en-vivo"]'), 2500);
    await step('back to resumen', () => page.click('.sidebar a[href="/"]'), 1500);
    const period = await page.getAttribute('[data-period="trimestre"]', 'aria-checked');
    console.log('filter persisted across views:', period);
    await page.reload({ waitUntil: 'networkidle' });
    console.log('filter persisted after reload:', await page.getAttribute('[data-period="trimestre"]', 'aria-checked'));
    await page.screenshot({ path: `${out}.png` });
  } else if (mode === 'frames') {
    // Samples the ?showcase loop: one screenshot every <everyMs> for <totalMs>.
    const [prefix = 'frame', everyMs = '2000', totalMs = '22000'] = args;
    const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/?showcase`);
    for (let t = Number(everyMs); t <= Number(totalMs); t += Number(everyMs)) {
      await page.waitForTimeout(Number(everyMs));
      await page.screenshot({ path: `${prefix}-${String(t).padStart(5, '0')}.png` });
    }
    console.log('frames ->', prefix);
  } else if (mode === 'export') {
    // Clicks "Exportar" on a scene and saves the PNG generated in the browser canvas.
    const [out = 'export.png', scrollTo = '#escena-1'] = args;
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
    await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView(), scrollTo);
    await page.waitForTimeout(3000);
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="export"]')]);
    await download.saveAs(out);
    console.log('export ->', out, download.suggestedFilename());
  } else {
    const [out = 'shot.png', w = '1440', h = '900', query = '', wait = '3000', scrollTo = '', script = ''] = args;
    const page = await browser.newPage({
      viewport: { width: Number(w), height: Number(h) },
      // REDUCED=1 emulates prefers-reduced-motion to check the static version.
      reducedMotion: process.env.REDUCED ? 'reduce' : 'no-preference',
    });
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
    page.on('pageerror', (e) => errors.push(String(e)));
    await page.goto(`http://127.0.0.1:${port}/${query}`, { waitUntil: 'networkidle' });
    if (scrollTo) {
      await page.evaluate((sel) => document.querySelector(sel)?.scrollIntoView(), scrollTo);
    }
    if (script) {
      await page.waitForTimeout(1500);
      // Optional interaction step, e.g. clicking a province before the capture.
      await page.evaluate(script);
    }
    await page.waitForTimeout(Number(wait));
    await page.screenshot({ path: out });
    console.log('shot ->', out);
  }
  console.log(errors.length ? `console errors:\n${errors.join('\n')}` : 'console errors: 0');
} finally {
  await browser.close();
  server.close();
}
