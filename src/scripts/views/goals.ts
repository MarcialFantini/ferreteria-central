// "Objetivos": editable monthly goals per seller, live progress and end-of-month projection.
import { SELLERS } from '../../data/catalog';
import { initials, monthProgress } from '../../data/sellers';
import { ringSVG, setRing } from '../../render/ring';
import { formatCompact, formatPercent } from '../../lib/format';
import { engine } from '../engine';
import { app, defaultGoals } from '../state';
import { onDispose } from '../lifecycle';
import { toast } from '../notify';

const STEP = 500_000;

export function mount(main: HTMLElement): void {
  const q = <T extends Element = HTMLElement>(sel: string) => main.querySelector<T>(sel);
  const tbody = q('[data-goal-rows]');
  const ringHost = q('[data-company-ring]');
  ringHost?.insertAdjacentHTML('afterbegin', ringSVG(0, 220, 16));
  if (!tbody) return;

  const set = (sel: string, text: string) => {
    const n = q(sel);
    if (n) n.textContent = text;
  };

  // Build rows once; update values in place so focus and typing are never interrupted.
  tbody.innerHTML = SELLERS.map(
    (s) => `<tr data-row="${s.id}">
      <th scope="row"><span style="display:inline-flex;gap:10px;align-items:center"><span class="avatar">${initials(s.name)}</span><a class="row-link" href="/vendedores/${s.id}">${s.name}</a></span></th>
      <td><span class="stepper"><button type="button" class="step" data-step="-1" aria-label="Bajar objetivo de ${s.name}">−</button><label><span class="sr-only">Objetivo de ${s.name}</span><input type="number" min="0" step="${STEP}" inputmode="numeric" data-goal="${s.id}"></label><button type="button" class="step" data-step="1" aria-label="Subir objetivo de ${s.name}">+</button></span></td>
      <td><span class="progress" aria-hidden="true"><i></i><b></b></span><span class="num" data-pct></span></td>
      <td class="num" data-mtd></td>
      <td class="num" data-proj></td>
      <td data-status></td>
    </tr>`,
  ).join('');

  const render = () => {
    const goals = app.get().goals;
    const progress = monthProgress(engine.day, engine.minute);
    let gSum = 0;
    let mSum = 0;
    for (const s of SELLERS) {
      const row = tbody.querySelector<HTMLElement>(`[data-row="${s.id}"]`);
      if (!row) continue;
      const goal = goals[s.id] ?? 0;
      const mtd = engine.monthToDate(s.id);
      const proj = progress > 0 ? mtd / progress : 0;
      gSum += goal;
      mSum += mtd;
      const input = row.querySelector<HTMLInputElement>('input');
      if (input && document.activeElement !== input) input.value = String(goal);
      const pct = goal ? mtd / goal : 0;
      const bar = row.querySelector<HTMLElement>('.progress i');
      if (bar) bar.style.transform = `scaleX(${Math.min(1, pct).toFixed(3)})`;
      const mark = row.querySelector<HTMLElement>('.progress b');
      if (mark) mark.style.left = `${Math.min(100, progress * 100).toFixed(1)}%`;
      row.querySelector('[data-pct]')!.textContent = `${Math.round(pct * 100)} %`;
      row.querySelector('[data-mtd]')!.textContent = formatCompact(mtd);
      row.querySelector('[data-proj]')!.textContent = formatCompact(proj);
      const ok = proj >= goal;
      row.querySelector('[data-status]')!.innerHTML = ok
        ? '<span class="tag tag--solid">En camino</span>'
        : `<span class="tag">Faltan ${formatCompact(goal - proj)}</span>`;
    }
    const pct = gSum ? mSum / gSum : 0;
    setRing(ringHost?.querySelector('svg.ring') ?? null, pct);
    set('[data-company-pct]', `${Math.round(pct * 100)} %`);
    set('[data-k="goal"]', formatCompact(gSum));
    set('[data-k="mtd"]', formatCompact(mSum));
    set('[data-k="proj"]', formatCompact(progress > 0 ? mSum / progress : 0));
    set('[data-k="progress"]', formatPercent(progress));
  };

  const save = (id: string, value: number) => {
    const v = Math.max(STEP, Math.round(value / STEP) * STEP);
    app.update('goals', (g) => ({ ...g, [id]: v }));
  };

  tbody.addEventListener('change', (e) => {
    const input = (e.target as HTMLElement).closest<HTMLInputElement>('[data-goal]');
    if (!input) return;
    save(input.dataset['goal'] ?? '', Number(input.value));
    toast('Objetivo actualizado', `${SELLERS.find((s) => s.id === input.dataset['goal'])?.name ?? ''}: ${formatCompact(Number(input.value))}`, { tone: 'success' });
  });
  tbody.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLElement>('[data-step]');
    if (!b) return;
    const id = b.closest<HTMLElement>('[data-row]')?.dataset['row'] ?? '';
    save(id, (app.get().goals[id] ?? 0) + Number(b.dataset['step']) * STEP);
  });
  q('[data-reset-goals]')?.addEventListener('click', () => {
    const prev = app.get().goals;
    app.update('goals', defaultGoals());
    toast('Objetivos restablecidos', 'Se volvió a los objetivos sugeridos (+8 % sobre octubre).', {
      action: { label: 'Deshacer', run: () => app.update('goals', prev) },
    });
  });

  engine.on('order', render);
  engine.on('day', render);
  onDispose(app.on('goals', render));
  render();
}
