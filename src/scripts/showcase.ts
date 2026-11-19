// ?showcase: an unattended ~24 s tour across the product, in a loop, for screen recording.
import { navigate } from 'astro:transitions/client';
import { CLIENTS, CLIENT_MONTH_REVENUE } from '../data/dataset';
import { engine } from './engine';
import { viewActions } from './view-actions';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Wait until the next view has mounted (or a timeout, so the loop never stalls). */
const nextView = () =>
  new Promise<void>((resolve) => {
    const done = () => {
      document.removeEventListener('astro:page-load', done);
      setTimeout(resolve, 350);
    };
    document.addEventListener('astro:page-load', done);
    setTimeout(resolve, 2500);
  });

async function go(href: string): Promise<void> {
  if (location.pathname === href) return;
  const wait = nextView();
  await navigate(href);
  await wait;
}

// The client with the most revenue last month: a rich detail page.
const star = CLIENTS.reduce((best, _c, i) => ((CLIENT_MONTH_REVENUE[i]?.[23] ?? 0) > (CLIENT_MONTH_REVENUE[best]?.[23] ?? 0) ? i : best), 0);

export async function startShowcase(): Promise<void> {
  try {
    sessionStorage.setItem('mc-showcase', '1');
  } catch {
    /* ignore */
  }
  document.documentElement.classList.add('is-showcase');
  engine.togglePause(false);
  engine.setSpeed(4);
  await sleep(600);

  for (;;) {
    await go('/');
    await sleep(400);
    viewActions().scenes?.go(0);
    await sleep(3200);
    viewActions().scenes?.go(1);
    await sleep(4200);

    engine.setSpeed(10);
    await go('/en-vivo');
    await sleep(4800);

    await go('/clientes');
    await sleep(2400);
    await go(`/clientes/${CLIENTS[star]?.id ?? 1}`);
    await sleep(2600);

    await go('/vendedores');
    await sleep(2800);

    await go('/productos');
    await sleep(2400);
    engine.setSpeed(4);
  }
}
