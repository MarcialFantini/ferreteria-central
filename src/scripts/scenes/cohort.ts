import { cohortData, type CohortRow } from '../../data/selectors';
import { cohortSVG } from '../../render/cohort';
import { miniSpark } from '../../render/sparkline';
import { formatCompact, formatPercent } from '../../lib/format';
import { gsap, dur, type Scene } from '../motion';
import { store } from '../store';
import { observeResize } from '../lifecycle';
import { hideTip, showTip } from '../tooltip';

export function mountCohort(el: HTMLElement): Scene {
  const q = <T extends Element = HTMLElement>(sel: string) => el.querySelector<T>(sel);
  const host = q('[data-cohort-chart]');
  let rows: CohortRow[] = cohortData(store.get());

  const render = () => {
    if (!host) return;
    const r = host.getBoundingClientRect();
    if (r.width < 10) return;
    host.innerHTML = cohortSVG(rows, Math.round(r.width), Math.round(r.height));
  };

  /** Cell-by-cell reveal along the diagonals (age + row), like a fill sweeping the triangle. */
  const reveal = (fast = false) => {
    const cells = [...(host?.querySelectorAll<SVGGElement>('.coh-cell') ?? [])];
    cells.sort((a, b) => {
      const ka = Number(a.dataset['row']) + Number(a.dataset['age']);
      const kb = Number(b.dataset['row']) + Number(b.dataset['age']);
      return ka - kb || Number(a.dataset['row']) - Number(b.dataset['row']);
    });
    gsap.fromTo(
      cells,
      { opacity: 0, scale: 0.4, transformOrigin: '50% 50%' },
      {
        opacity: 1,
        scale: 1,
        duration: dur(fast ? 0.3 : 0.45),
        ease: 'back.out(1.8)',
        stagger: dur(fast ? 0.006 : 0.018),
      },
    );
  };

  host?.addEventListener('pointermove', (e) => {
    const cell = (e.target as Element).closest<SVGGElement>('.coh-cell');
    if (!cell || cell.classList.contains('is-empty')) return hideTip();
    const row = rows[Number(cell.dataset['row'])];
    const age = Number(cell.dataset['age']);
    const c = row?.cells[age];
    if (!row || !c) return;
    const series = row.cells.map((x) => x.retention ?? 0);
    showTip(
      {
        title: `Cohorte ${row.label} · ${age === 0 ? 'mes de alta' : `${age} ${age === 1 ? 'mes' : 'meses'} después`}`,
        value: formatPercent(c.retention ?? 0),
        chart: miniSpark(series, age, 220, 56),
        rows: [
          ['Clientes activos', `${c.active} de ${c.size}`],
          ['Facturación', formatCompact(c.revenue)],
        ],
        hint: 'Retención de facturación vs. mes de alta',
      },
      e.clientX,
      e.clientY,
    );
  });
  host?.addEventListener('pointerleave', hideTip);

  observeResize(host ?? el, render);

  const renderTable = () => {
    const tbody = q('[data-cohort-table] tbody');
    if (!tbody) return;
    tbody.innerHTML = rows
      .map(
        (r) =>
          `<tr><th scope="row">${r.label}</th><td>${r.size}</td>${Array.from({ length: 12 }, (_, a) => {
            const c = r.cells[a];
            return `<td>${c && c.retention !== null ? formatPercent(c.retention) : '—'}</td>`;
          }).join('')}</tr>`,
      )
      .join('');
  };

  store.subscribe((next, prev) => {
    if (next.seller === prev.seller && next.province === prev.province) return;
    rows = cohortData(next);
    render();
    renderTable();
    reveal(true);
  });

  render();

  return {
    id: 'cohort',
    el,
    enter: () => reveal(),
    exportTarget: () => {
      const svg = host?.querySelector('svg');
      return svg ? { el: svg, title: 'Cohortes de clientes · retención de facturación' } : null;
    },
  };
}
