import { useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type { Periodo, RangoVentas, Route } from '../types/venta';
import { PRIMER_MES, ULTIMO_MES } from '../lib/datos';
import { readLS } from '../lib/storage';
import Sidebar, { MobileSidebar } from './Sidebar';
import DateRangeBar from './DateRangeBar';
import GuidedTour, { type TourStep } from './GuidedTour';
import { buildComparison } from '../lib/periodCompare';
import { hydratePageState, usePageContext } from './usePageContext';

export const ROUTES: ReadonlyArray<Route> = [
  { key: 'inicio',     label: 'Inicio',     href: '/',          description: 'Vista general de KPIs' },
  { key: 'ventas',     label: 'Ventas',     href: '/ventas',    description: 'Listado detallado de ventas' },
  { key: 'productos',  label: 'Productos',  href: '/productos', description: 'Top productos y catálogo' },
  { key: 'clientes',   label: 'Clientes',   href: '/clientes',  description: 'Segmentación RFM' },
  { key: 'tendencias', label: 'Tendencias', href: '/tendencias',description: 'Análisis temporal avanzado' },
];

const SIDEBAR_KEY = 'ferreteria-sidebar-collapsed';
const TOUR_KEY = 'ferreteria-tour-completed';

interface AppShellProps {
  activeKey: Route['key'];
  hero?: ReactNode;
  badges?: Partial<Record<Route['key'], string | number>>;
  tourSteps?: TourStep[];
  showTour?: boolean;
  /** Contenido principal (página). */
  children: ReactNode;
}

export default function AppShell({ activeKey, hero, badges, tourSteps, showTour, children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const ctx = usePageContext();
  const { periodo, customRange, setPeriodo, setCustomRange } = ctx;

  useEffect(() => {
    setCollapsed(readLS<boolean>(SIDEBAR_KEY, false));
    hydratePageState();
  }, []);

  const handleToggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    try { window.localStorage.setItem(SIDEBAR_KEY, JSON.stringify(next)); } catch {}
  };

  const comparison = useMemo(() => {
    if (periodo === 'todo') return null;
    try { return buildComparison(periodo, customRange); } catch { return null; }
  }, [periodo, customRange]);

  return (
    <div className="flex min-h-dvh bg-dash-surface">
      <Sidebar
        activeKey={activeKey}
        routes={ROUTES}
        collapsed={collapsed}
        onToggleCollapsed={handleToggleCollapsed}
        badges={badges}
      />
      <MobileSidebar
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        activeKey={activeKey}
        routes={ROUTES}
        badges={badges}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-dash-line bg-dash-surface/95 backdrop-blur">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md border border-dash-line bg-dash-panel p-1.5 text-dash-ink-2 hover:text-dash-ink lg:hidden"
              aria-label="Abrir menú de navegación"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <span className="text-[11px] font-medium uppercase tracking-wider text-dash-ink-3 lg:hidden">
              Ferretería Central
            </span>
            <div className="ml-auto flex items-center gap-2">
              <span className="hidden text-[11px] text-dash-ink-3 sm:inline">
                Demo · datos simulados 2018–2025
              </span>
            </div>
          </div>
        </header>

        <main id="main-content" className="flex-1 px-4 pb-12 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pt-8">
          {hero}
          <div className="mt-4 sm:mt-6">
            <DateRangeBar
              periodo={periodo}
              onPeriodoChange={setPeriodo}
              customRange={customRange}
              onCustomRangeChange={setCustomRange}
              comparison={comparison ? {
                ventasActual: comparison.ventasActual,
                ventasPrevio: comparison.ventasPrevio,
                deltaVentas: comparison.deltaVentas,
                labelActual: comparison.labelActual,
                labelPrevio: comparison.labelPrevio,
              } : null}
            />
          </div>
          <div className="mt-5 sm:mt-6">
            {children}
          </div>
        </main>

        <footer className="border-t border-dash-line bg-dash-panel/40 px-4 py-4 text-[11px] text-dash-ink-3 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Ferretería Central <span className="text-dash-line">·</span> Dashboard de ventas <span className="text-dash-line">·</span> Demo con datos simulados
            </p>
            <p className="tabular">
              Astro 7 <span className="text-dash-line">·</span> React 19 <span className="text-dash-line">·</span> Recharts <span className="text-dash-line">·</span> Tailwind v4
            </p>
          </div>
        </footer>
      </div>

      {showTour && tourSteps && (
        <GuidedTour storageKey={TOUR_KEY} steps={tourSteps} />
      )}
    </div>
  );
}