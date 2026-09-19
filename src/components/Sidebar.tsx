import { useEffect } from 'react';
import type { Route } from '../types/venta';

interface SidebarProps {
  activeKey: Route['key'];
  routes: ReadonlyArray<Route>;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  badges?: Partial<Record<Route['key'], string | number>>;
}

/**
 * Sidebar colapsable con badges/contadores.
 *
 * - En desktop (lg+): se expande/colapsa con un botón, ocupa 240px/72px.
* - En mobile (<lg): drawer flotante con overlay; el contenido principal
 *   se desplaza hacia la derecha cuando está abierto.
 * - Persistencia del estado colapsado en localStorage.
 */
export default function Sidebar({
  activeKey,
  routes,
  collapsed,
  onToggleCollapsed,
  badges = {},
}: SidebarProps) {
  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={
          'no-print hidden lg:flex flex-col shrink-0 border-r border-dash-line bg-dash-panel transition-[width] duration-200 ease-out ' +
          (collapsed ? 'w-[72px]' : 'w-[240px]')
        }
        aria-label="Navegación principal"
      >
        <SidebarHeader collapsed={collapsed} />
        <SidebarNav
          activeKey={activeKey}
          routes={routes}
          collapsed={collapsed}
          badges={badges}
        />
<SidebarFooter collapsed={collapsed} onToggle={onToggleCollapsed} />
      </aside>
    </>
  );
}

export function MobileSidebar({
  open,
  onClose,
  activeKey,
  routes,
  badges = {},
}: {
  open: boolean;
  onClose: () => void;
  activeKey: Route['key'];
  routes: ReadonlyArray<Route>;
  badges?: Partial<Record<Route['key'], string | number>>;
}) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEsc);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onEsc);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="no-print fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black/60 anim-fade-up"
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className="absolute left-0 top-0 flex h-full w-[280px] flex-col border-r border-dash-line bg-dash-panel shadow-2xl anim-fade-up"
        aria-label="Navegación principal"
      >
        <SidebarHeader collapsed={false} onClose={onClose} />
        <SidebarNav activeKey={activeKey} routes={routes} collapsed={false} badges={badges} onNavigate={onClose} />
      </aside>
    </div>
  );
}

function SidebarHeader({ collapsed, onClose }: { collapsed: boolean; onClose?: () => void }) {
  return (
    <div className="flex items-center justify-between border-b border-dash-line px-3 py-4">
      <a href="/" className="flex items-center gap-2.5 no-underline" aria-label="Ferretería Central — Inicio">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-dash-accent/15 text-dash-accent ring-1 ring-inset ring-dash-accent/30"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M14.7 6.3a4.5 4.5 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4.5 4.5 0 0 0 5.4-5.4l-2.4 2.4-2.6-2.6 2.4-2.4z" />
          </svg>
        </span>
        {!collapsed && (
          <span className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-dash-ink">Ferretería Central</span>
            <span className="text-[10px] uppercase tracking-wider text-dash-ink-3">Demo — 2018–2025</span>
          </span>
        )}
      </a>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink lg:hidden"
          aria-label="Cerrar menú"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function SidebarNav({
  activeKey,
  routes,
  collapsed,
  badges,
  onNavigate,
}: {
  activeKey: Route['key'];
  routes: ReadonlyArray<Route>;
  collapsed: boolean;
  badges: Partial<Record<Route['key'], string | number>>;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-4">
      <ul className="flex flex-col gap-0.5">
        {routes.map((route) => {
          const isActive = route.key === activeKey;
          const badge = badges[route.key];
          return (
            <li key={route.key}>
              <a
                href={route.href}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                aria-label={route.label}
                title={collapsed ? route.label : undefined}
                className={
                  'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium no-underline transition-colors ' +
                  (isActive
                    ? 'bg-dash-accent/15 text-dash-ink ring-1 ring-inset ring-dash-accent/30'
                    : 'text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink')
                }
              >
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-dash-accent"
                    aria-hidden="true"
                  />
                )}
                <RouteIcon route={route.key} active={isActive} />
                {!collapsed && (
                  <>
                    <span className="flex-1">{route.label}</span>
                    {badge !== undefined && (
                      <span
                        className={
                          'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular ' +
                          (typeof badge === 'number'
                            ? 'bg-dash-accent/15 text-dash-accent ring-1 ring-inset ring-dash-accent/30'
                            : 'bg-dash-warning/15 text-dash-warning ring-1 ring-inset ring-dash-warning/30')
                        }
                      >
                        {badge}
                      </span>
                    )}
                  </>
                )}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function SidebarFooter({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <div className="border-t border-dash-line px-2 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        title={collapsed ? 'Expandir' : 'Colapsar'}
        className={
          'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium text-dash-ink-2 hover:bg-dash-panel-2 hover:text-dash-ink ' +
          (collapsed ? 'justify-center' : 'justify-between')
        }
      >
        {!collapsed && <span>Colapsar</span>}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={'h-3.5 w-3.5 transition-transform ' + (collapsed ? 'rotate-180' : '')}
          aria-hidden="true"
        >
          <path d="M11 17l-5-5 5-5M18 17l-5-5 5-5" />
        </svg>
      </button>
    </div>
  );
}

function RouteIcon({ route, active }: { route: Route['key']; active: boolean }) {
  const common = 'h-4 w-4 shrink-0';
  const stroke = active ? 'text-dash-accent' : 'text-dash-ink-2';
  switch (route) {
    case 'inicio':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${common} ${stroke}`} aria-hidden="true">
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case 'ventas':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${common} ${stroke}`} aria-hidden="true">
          <path d="M3 17l6-6 4 4 8-8M14 7h7v7" />
        </svg>
      );
    case 'productos':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${common} ${stroke}`} aria-hidden="true">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96 12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
      );
    case 'clientes':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${common} ${stroke}`} aria-hidden="true">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'tendencias':
      return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`${common} ${stroke}`} aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
  }
}
