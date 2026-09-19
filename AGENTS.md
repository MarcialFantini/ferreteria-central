# AGENTS — 10-dashboard-ventas

Dashboard dark-mode para Ferretería Central (PyME ficticia, 8 años de ventas, 96 meses). SSG con una sola isla React que monta Recharts. Datos seed en `src/data/` (ventas 96 meses / diarias 731 / productos 32 / clientes 80 / categorías 6 / pedidos completo).

## Componentes principales

- `src/components/AppShell.tsx` — provider de `PageContext`, mobile sidebar, persistencia de estado colapsado en localStorage.
- `src/components/Page.tsx` — contenedor común (header + main landmark).
- `src/components/Sidebar.tsx` — nav desktop (240/72px) + `MobileSidebar` (drawer flotante).
- `src/components/DateRangeBar.tsx` — selector de período (`ultimos_6` / `ultimo_anio` / `todo` / `personalizado`) + date-range popover + `ComparisonBadge` (toggle vs período previo con delta ▲▼).
- `src/components/KPICard.tsx` — label + valor + badge de delta + opcional drill-down.
- `src/components/ChartCard.tsx` — wrapper visual con title/subtitle/badge/children y variantes de padding.
- `src/components/DataTable.tsx` — tabla con sort, search, filtros, paginación y export CSV.
- `src/components/DrillDownModal.tsx` — modal de detalle al clickear un KPI o un punto del chart.
- `src/components/Sparkline.tsx` — mini línea para KPIs (sin axes/tooltip).
- `src/components/DeltaBadge.tsx` — badge ▲▼ con color success/danger/neutral.
- `src/components/GuidedTour.tsx` — tour de 6 pasos con popover sobre targets.
- `src/components/vistas/VistaInicio.tsx` — `/` — KPIs + comparativa + tabla.
- `src/components/vistas/VistaVentas.tsx` — `/ventas` — KPIs + barras top + tabla.
- `src/components/vistas/VistaProductos.tsx` — `/productos` — catálogo completo + top + mix.
- `src/components/vistas/VistaClientes.tsx` — `/clientes` — RFM, radar, tabla de cartera.
- `src/components/vistas/VistaTendencias.tsx` — `/tendencias` — heatmap, estacionalidad, waterfall.
- `src/components/charts/` — 9 charts Recharts + 1 heatmap custom SVG. Todos los que usan Recharts tienen `role="img"` + `aria-label`.

## Lib

- `src/lib/datos.ts` — `getVentasPorPeriodo`, `getKPIs`, `formatARS`, `getTopProductos`, `getIngresoPorCategoria`, `colorDeCategoria`, `CATEGORIA_LABELS`.
- `src/lib/clientes.ts` — `segmentarClientes` (RFM), `statsPorSegmento`, `statsPorTipo`, `SEGMENTO_COLORS`.
- `src/lib/tendencias.ts` — `buildEstacionalidadMensual`, `buildWaterfallMensual`, `buildHeatmapCalendario`, `buildRadarTipoCliente`.
- `src/lib/periodCompare.ts` — `getPeriodoPrevio`, `buildComparison` (delta ventas/pedidos/ticket).
- `src/lib/csv.ts` — `exportCSV` para DataTable.
- `src/lib/storage.ts` — `readLS` / `writeLS` (localStorage tipado).

## Consistencia KPI ↔ chart (T10.16)

`buildComparison()` consume el mismo `getVentasPorPeriodo(desde, hasta)` que `GraficoLineas`. Esto garantiza que el KPI "Ventas totales" siempre coincide con la suma de los puntos del chart para todos los períodos (incluido "personalizado").

**Verificación empírica**: `node scripts/verify-consistency.mjs` debe pasar. Si no pasa, NO commitear cambios en `src/data/` o en los selectores.

## Scripts

- **Vigentes** en `scripts/`: `verify-consistency.mjs`, `generate-data.mjs`. Ver `scripts/README.md` para detalle.
- **Históricos** en `scripts/_archive/`: bootstrap inicial, encoding-fix v1-v5, palette/em-dash fixer. NO borrar — son historia del proyecto.

## Encoding

Todos los archivos están en UTF-8 sin BOM. Si ves `\uFFFD` o `�` en consola significa que algo se corrompió. El sweep completo (208 → 0 FFFD) está documentado en M10.1.1.

## Stack cerrado

`astro@^7`, `@astrojs/react`, `react@^19`, `tailwindcss@^4` vía `@tailwindcss/vite`, `recharts@^3.6`. Sin Preact, sin Phosphor/lucide, sin Chart.js, sin `react-icons`. Tipografías Inter + JetBrains Mono vía Bunny Fonts. No agregar dependencias sin discutirlo.

## Convenciones

- **Tokens de color**: usar `var(--color-dash-*)` en clases Tailwind o en estilos inline. Nunca hardcodear hex salvo fallback en SVG.
- **Aria-label**: todo chart y todo KPI card interactivo debe tener `aria-label` humano. El usuario lo lee, no solo el screen reader.
- **Números**: usar `formatARS()` para moneda, `formatNumber()` para enteros, `formatPercent()` para porcentajes. Nunca `.toLocaleString()` directo.
- **No agregar lógica de período** en las vistas: vienen de `usePageContext()` y ya están filtradas upstream en `buildComparison` o en el selector.
- **No mover datos a runtime**. Son SSG — todo se compila al bundle.