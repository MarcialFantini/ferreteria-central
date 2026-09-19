import type { ReactNode } from 'react';
import type { Route } from '../types/venta';
import AppShell from './AppShell';

interface PageProps {
  activeKey: Route['key'];
  title: string;
  description: string;
  badges?: Partial<Record<Route['key'], string | number>>;
  tourSteps?: Array<{ target?: string; title: string; body: string; placement?: 'top' | 'bottom' | 'left' | 'right' | 'center' }>;
  showTour?: boolean;
  /** Páginas hijas: VistaInicio, VistaVentas, etc. */
  children: ReactNode;
}

export default function Page({
  activeKey,
  title,
  description,
  badges,
  tourSteps,
  showTour,
  children,
}: PageProps) {
  return (
    <AppShell
      activeKey={activeKey}
      badges={badges}
      tourSteps={tourSteps}
      showTour={showTour}
      hero={
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <nav className="mb-2 flex items-center gap-1 text-[11px] uppercase tracking-wider text-dash-ink-3" aria-label="Breadcrumb">
              <a href="/" className="no-underline hover:text-dash-ink-2">Inicio</a>
              {activeKey !== 'inicio' && (
                <>
                  <span aria-hidden="true">›</span>
                  <span className="text-dash-ink-2">{title}</span>
                </>
              )}
            </nav>
            <h1 className="text-2xl font-semibold tracking-tight text-dash-ink sm:text-3xl">
              {title}
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13px] text-dash-ink-2 sm:text-sm">{description}</p>
          </div>
        </div>
      }
    >
      {children}
    </AppShell>
  );
}