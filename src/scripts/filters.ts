// Global filter controls (persisted topbar) -> shared state. Every view transitions on its own.
import type { Filters, Period } from '../data/selectors';
import { store } from './store';

export function mountFilters(): void {
  const radios = [...document.querySelectorAll<HTMLButtonElement>('[data-period]')];
  const seller = document.querySelector<HTMLSelectElement>('[data-seller]');
  const province = document.querySelector<HTMLSelectElement>('[data-province]');

  const select = (btn: HTMLButtonElement, focus: boolean) => {
    if (focus) btn.focus();
    store.set({ period: btn.dataset['period'] as Period });
  };

  radios.forEach((btn, i) => {
    btn.addEventListener('click', () => select(btn, false));
    // Radiogroup keyboard pattern: arrows move and select.
    btn.addEventListener('keydown', (e) => {
      const delta = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
      if (!delta) return;
      e.preventDefault();
      e.stopPropagation();
      const next = radios[(i + delta + radios.length) % radios.length];
      if (next) select(next, true);
    });
  });

  seller?.addEventListener('change', () => store.set({ seller: seller.value }));
  province?.addEventListener('change', () => store.set({ province: province.value }));

  const sync = (f: Filters) => {
    radios.forEach((r) => {
      const on = r.dataset['period'] === f.period;
      r.setAttribute('aria-checked', String(on));
      r.tabIndex = on ? 0 : -1;
    });
    if (seller) {
      seller.value = f.seller;
      seller.classList.toggle('is-set', f.seller !== 'all');
    }
    if (province) {
      province.value = f.province;
      province.classList.toggle('is-set', f.province !== 'all');
    }
  };
  store.subscribe((next) => sync(next), { persistent: true });
  sync(store.get());
}
