import { formatARS, formatNumber } from '../lib/datos';
import DeltaBadge from './DeltaBadge';
import Sparkline from './Sparkline';

export type KPIIcono =
  | 'money' | 'cart' | 'ticket' | 'box' | 'package'
  | 'tag' | 'star' | 'users' | 'trend-up' | 'calendar' | 'percent';

export interface KPICardProps {
  label: string;
  value: number | string;
  variacionPorcentual?: number;
  icono: KPIIcono;
  formato: 'currency' | 'number' | 'percent';
  spark?: ReadonlyArray<number>;
  accent: string;
  suffix?: string;
  onDrillDown?: () => void;
}

/** Tarjeta KPI premium (dark). Incluye icono, valor, delta y spark. */
export default function KPICard({
  label,
  value,
  variacionPorcentual = 0,
  icono,
  formato,
  spark,
  accent,
  suffix,
  onDrillDown,
}: KPICardProps) {
  const interactive = typeof onDrillDown === 'function';

  const handle = (e: React.MouseEvent) => {
    if (!interactive) return;
    onDrillDown();
    e.preventDefault();
  };
  const handleKey = (e: React.KeyboardEvent) => {
    if (!interactive) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onDrillDown();
    }
  };

  const numeric = typeof value === 'number' ? value : Number(value) || 0;
  let formatted: string;
  if (typeof value === 'string') {
    formatted = value;
  } else if (formato === 'currency') {
    formatted = formatARS(numeric);
  } else if (formato === 'percent') {
    formatted = `${numeric.toFixed(1)}%`;
  } else if (suffix) {
    formatted = `${formatNumber(numeric)} ${suffix}`;
  } else {
    formatted = formatNumber(numeric);
  }

  return (
    <div
      onClick={interactive ? handle : undefined}
      onKeyDown={interactive ? handleKey : undefined}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-label={interactive ? `Ver desglose de ${label}` : undefined}
      className={
        'surface-card flex flex-col gap-3 p-4 sm:p-5 ' +
        (interactive ? 'surface-card-interactive cursor-pointer focus:outline-none' : 'surface-card-hover')
      }
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-[11px] font-medium uppercase tracking-wider text-dash-ink-2">
          {label}
        </span>
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md ring-1 ring-inset"
          style={{
            backgroundColor: `${accent}1A`,
            color: accent,
            ['--tw-ring-color' as any]: `${accent}33`,
          }}
          aria-hidden="true"
        >
          <KPIIconSVG icon={icono} />
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-2xl font-semibold tracking-tight tabular-nums text-dash-ink sm:text-[26px]">
          {formatted}
        </span>
        {variacionPorcentual !== 0 && (
          <DeltaBadge value={variacionPorcentual} />
        )}
      </div>
      {spark && spark.length > 0 && (
        <Sparkline data={spark} color={accent} />
      )}
    </div>
  );
}

function KPIIconSVG({ icon }: { icon: KPIIcono }) {
  const cls = 'h-3.5 w-3.5';
  switch (icon) {
    case 'money':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <line x1="12" y1="2" x2="12" y2="22" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'cart':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6" />
        </svg>
      );
    case 'ticket':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M2 9V5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v4a2 2 0 0 0 0 4v4a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-4a2 2 0 0 0 0-4z" />
          <path d="M13 5v14" />
        </svg>
      );
    case 'box':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
      );
    case 'package':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      );
    case 'tag':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M20.59 13.41 13.42 20.58a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      );
    case 'star':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'users':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'trend-up':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
          <polyline points="17 6 23 6 23 12" />
        </svg>
      );
    case 'calendar':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'percent':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cls} aria-hidden="true">
          <line x1="19" y1="5" x2="5" y2="19" />
          <circle cx="6.5" cy="6.5" r="2.5" />
          <circle cx="17.5" cy="17.5" r="2.5" />
        </svg>
      );
  }
}