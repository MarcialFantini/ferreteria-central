import type { ReactNode } from 'react';

interface ChartCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Padding interno. Default 'normal' (16-20px). */
  padding?: 'tight' | 'normal' | 'loose';
  /** Clases extra para el wrapper externo (e.g. spans de grid). */
  className?: string;
}

/**
 * Card contenedor de gráficos. Header con título, subtítulo y acciones.
 * Animación de entrada con fade-up.
 */
export default function ChartCard({ title, subtitle, badge, action, children, padding = 'normal', className }: ChartCardProps) {
  const padCls = padding === 'tight' ? 'p-3' : padding === 'loose' ? 'p-6' : 'p-4 sm:p-5';
  return (
    <section className={'surface-card anim-fade-up ' + padCls + (className ? ' ' + className : '')} aria-label={title}>
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold tracking-tight text-dash-ink">{title}</h2>
            {badge && (
              <span className="inline-flex items-center rounded-md border border-dash-line bg-dash-surface px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-dash-ink-3">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[12px] text-dash-ink-2">{subtitle}</p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>
      {children}
    </section>
  );
}
