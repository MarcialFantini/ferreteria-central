/**
 * Badge reutilizable de delta ?? (verde/rojo/neutral).
 */

interface DeltaBadgeProps {
  value: number;
  suffix?: string;
  size?: 'sm' | 'md';
  invert?: boolean; // true si menor es mejor
}

export default function DeltaBadge({ value, suffix = '%', size = 'sm', invert = false }: DeltaBadgeProps) {
  const rawPositive = invert ? value < 0 : value > 0;
  const neutral = value === 0;
  const cls = neutral
    ? 'border-dash-line bg-dash-surface text-dash-ink-3'
    : rawPositive
      ? 'border-dash-success/40 bg-dash-success/10 text-dash-success'
      : 'border-dash-danger/40 bg-dash-danger/10 text-dash-danger';
  const pad = size === 'md' ? 'px-2.5 py-1 text-xs' : 'px-2 py-0.5 text-[11px]';
  const aria = neutral
    ? 'Sin cambio'
    : rawPositive
      ? `Subió ${Math.abs(value).toFixed(1)} por ciento`
      : `Bajó ${Math.abs(value).toFixed(1)} por ciento`;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border font-medium tabular ${cls} ${pad}`}
      role="status"
      aria-label={aria}
    >
      {!neutral && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 ${rawPositive ? '' : 'rotate-180'}`} aria-hidden="true">
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      )}
      {neutral ? '—' : `${value > 0 ? '+' : ''}${value.toFixed(1)}${suffix}`}
    </span>
  );
}
