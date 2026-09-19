# 10 · Dashboard de ventas — Ferretería Central

Dashboard analítico dark-mode para una PyME de barrio ficticia ("Ferretería Central", 8 años de ventas). Muestra facturación mensual, ticket promedio, variación anual, ranking de productos por ingreso, segmentación RFM de clientes y estacionalidad por día/mes. Filtra por período (últimos 6 meses / último año / todo / rango personalizado) sin recargar.

> **Cliente ficticio.** Los datos están simulados — ver [Disclaimer](#disclaimer).

---

## Problema

Una ferretería de barrio con 8 años de ventas tiene un sistema de facturación que registra las ventas, pero **no tiene una vista consolidada** que le permita responder preguntas simples del día a día:

- ¿Cuánto vendimos este mes vs. el anterior?
- ¿El ticket promedio está subiendo o bajando?
- ¿Qué productos generan más ingresos?
- ¿Cuál es el mejor y el peor mes del último año?
- ¿Qué días de la semana facturan más?
- ¿Mis clientes están activos o se están yendo?

Las respuestas están en planillas y en el sistema POS, pero nadie las cruza. Un dashboard mínimo que cargue rápido, funcione en mobile y permita filtrar por período resuelve el 80% del problema sin tocar el backend del POS.

## Solución

Una página estática (Astro SSG) que monta una sola isla React con **Recharts** y datos seed. Toda la lógica de filtrado vive en el cliente, pero como los datos están compilados en el HTML, el sitio sirve sin backend y carga casi instantáneo.

- **6 KPI cards** arriba: ventas totales, pedidos, ticket promedio, variación anual, top categoría y producto más vendido — cada uno con badge de delta en color y signo.
- **9 charts Recharts**: líneas (ventas por mes), áreas apiladas (mix por categoría), barras horizontales (top productos), donut (mix por categoría y por tipo de cliente), radar (perfil de cliente), scatter (pedidos vs ventas por día), waterfall (cascada de deltas mensuales), comparación (período actual vs previo), heatmap custom (calendario de calor 53×7).
- **Tabla** de detalle con margen y unidades.
- **DateRangeBar** con 4 botones (`aria-pressed`): "Últimos 6 meses", "Último año", "Todo" y "Personalizado" (con date-range picker mes-año).
- **Toggle de comparación** con período previo (mostrar delta % con flecha ▲▼).
- **Drill-down modal** al clickear un KPI o un punto del chart.
- **Guided tour** de 6 pasos para usuarios nuevos.

El KPI "Ventas totales" **siempre coincide** con la suma de los puntos del LineChart en el rango seleccionado — `buildComparison()` consume el mismo `getVentasPorPeriodo(desde, hasta)` que el gráfico. La regla T10.16 (consistencia KPI ↔ chart) está verificada por `scripts/verify-consistency.mjs`.

## Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Astro 7.3.3** | SSG puro, única isla React, 0 JS para la página en reposo. |
| UI interactiva | **React 19** (vía `@astrojs/react`) | Ecosistema de charting más maduro. Único proyecto del portfolio que usa React (los demás usan Preact). |
| Charts | **Recharts 3.6.0** | Declarativo, tree-shaking fuerte, sin canvas/imperativo. Ver justificación abajo. |
| Estilos | **Tailwind v4** (`@tailwindcss/vite`) | Configuración con `@theme` en `src/styles/global.css` — sin `tailwind.config.js`. |
| Tipografía | **Inter** (UI) + **JetBrains Mono** (números) vía Bunny Fonts | `display=swap`, no bloquea LCP. |
| Lenguaje | **TypeScript estricto** (`astro/tsconfigs/strict`) | `astro check` en CI para 0 errores. |
| Package manager | **pnpm 11** (exclusivo) | Lockfile versionado, `node_modules` aislado por proyecto. |

## Cómo correrlo

```sh
# Requisitos: Node >=22.12, pnpm >=11
pnpm install        # instala astro, react, tailwind v4, recharts
pnpm dev            # dev server en http://localhost:4321
pnpm build          # genera dist/ (SSG, 5 páginas)
pnpm preview        # sirve dist/ localmente
pnpm astro check    # type-check (.astro + .ts + .tsx) — debe dar 0 errores

# Verificación extra de consistencia (T10.16):
node scripts/verify-consistency.mjs
```

El proyecto es **100% SSG** — no hay adapter de SSR, no hay endpoints. Toda la "interactividad" es React dentro de una isla.

## Estructura

```
portfolio/10-dashboard-ventas/
├── astro.config.mjs                 # integrations: react() + vite plugin tailwindcss()
├── package.json                     # astro 7, @astrojs/react, recharts, react 19
├── tsconfig.json                    # extends astro/tsconfigs/strict
├── AGENTS.md                        # convenciones para AI agents
├── scripts/
│   ├── README.md                    # descripción de scripts vigentes y archivados
│   ├── verify-consistency.mjs       # T10.16 — chequea KPI == suma del chart
│   ├── generate-data.mjs            # regenera los 6 archivos de src/data/
│   └── _archive/                    # scripts históricos (bootstrap, encoding-fix, etc.)
├── public/
│   └── favicon.svg                  # SVG inline (no PNG)
└── src/
    ├── components/
    │   ├── AppShell.tsx             # provider de PageContext, mobile sidebar, persisted state
    │   ├── Page.tsx                 # contenedor común (header + main)
    │   ├── Sidebar.tsx              # nav desktop (240/72px) + MobileSidebar (drawer)
    │   ├── DateRangeBar.tsx         # selector de período + date-range popover + ComparisonBadge
    │   ├── KPICard.tsx              # label + valor + badge de delta + opcional drill-down
    │   ├── ChartCard.tsx            # wrapper visual con title/subtitle/badge/children
    │   ├── DataTable.tsx            # tabla con sort, search, filtros, paginación y CSV export
    │   ├── DrillDownModal.tsx       # modal de detalle al clickear un KPI o chart point
    │   ├── Sparkline.tsx            # mini línea para KPIs (sin axes/tooltip)
    │   ├── DeltaBadge.tsx           # badge ▲▼ con color success/danger/neutral
    │   ├── GuidedTour.tsx           # tour de 6 pasos con popover sobre targets
    │   ├── PageContext.ts           # define PageContextValue (periodo, customRange, setters)
    │   ├── usePageContext.ts        # hook que subscribe a cambios globales de contexto
    │   ├── vistas/
    │   │   ├── VistaInicio.tsx      # /index — KPIs + comparativa + tabla
    │   │   ├── VistaVentas.tsx      # /ventas — KPIs + barras top + tabla
    │   │   ├── VistaProductos.tsx   # /productos — catálogo completo + top + mix
    │   │   ├── VistaClientes.tsx    # /clientes — RFM, radar, tabla de cartera
    │   │   └── VistaTendencias.tsx  # /tendencias — heatmap, estacionalidad, waterfall
    │   └── charts/
    │       ├── GraficoLineas.tsx           # LineChart ventas por mes (con aria-label)
    │       ├── GraficoAreasApiladas.tsx    # AreaChart mix por categoría (con aria-label)
    │       ├── GraficoBarras.tsx           # BarChart horizontal top 10 productos
    │       ├── GraficoCategorias.tsx       # DonutChart mix por categoría/tipo
    │       ├── GraficoComparacion.tsx      # dos líneas (actual vs previo, con aria-label)
    │       ├── GraficoRadar.tsx            # RadarChart perfil cliente (con aria-label)
    │       ├── GraficoScatter.tsx          # ScatterChart pedidos vs ventas (con aria-label)
    │       ├── GraficoWaterfall.tsx        # cascada de deltas mensuales (con aria-label)
    │       └── GraficoHeatmap.tsx          # heatmap custom SVG 53×7 (sin Recharts)
    ├── data/
    │   ├── ventas.json              # 96 meses (8 años)
    │   ├── ventas-diarias.json      # 731 días con ventas y pedidos
    │   ├── productos.json           # 32 SKUs en 6 categorías
    │   ├── categorias.json          # 6 categorías con color y label
    │   ├── clientes.json            # 80 clientes con perfil RFM
    │   └── pedidos.json             # detalle de cada pedido
    ├── lib/
    │   ├── datos.ts                 # getVentasPorPeriodo / getKPIs / formatARS / getTopProductos
    │   ├── clientes.ts              # segmentarClientes (RFM), statsPorSegmento, statsPorTipo
    │   ├── tendencias.ts            # buildEstacionalidadMensual, buildWaterfall, buildHeatmap, buildRadarTipoCliente
    │   ├── periodCompare.ts         # getPeriodoPrevio, buildComparison (delta ventas/pedidos/ticket)
    │   ├── csv.ts                   # export CSV para DataTable
    │   └── storage.ts               # readLS / writeLS (localStorage tipado)
    ├── layouts/
    │   └── Layout.astro             # SEO base, Bunny Fonts, skip link, OG/Twitter cards
    ├── pages/
    │   ├── index.astro              # /  → <VistaInicio />
    │   ├── ventas.astro             # /ventas → <VistaVentas />
    │   ├── tendencias.astro         # /tendencias → <VistaTendencias />
    │   ├── productos.astro          # /productos → <VistaProductos />
    │   └── clientes.astro           # /clientes → <VistaClientes />
    ├── styles/
    │   └── global.css               # Tailwind v4 + @theme (paleta dark + tipografías)
    └── types/
        ├── venta.ts                 # VentaMensual, Periodo, KPIs, RangoVentas, Route, VentaDiaria
        └── producto.ts              # Producto, CATEGORIA_LABELS
```

## Decisiones técnicas

### Recharts vs Chart.js

**Elegido: Recharts.** Razones:

1. **API declarativa React-first.** Cada chart es un componente JSX con props. La curva de aprendizaje es la del propio React. Chart.js envuelve un canvas imperativo que requiere refs y configs mutables — más fricción al integrarlo con un sistema declarativo.
2. **Tree-shaking real.** Recharts exporta `Line`, `Bar`, `XAxis`, etc. por separado — sólo entra al bundle lo que el dashboard usa. Chart.js registra controllers/elements globales; en árbol chico se justifica con `chart.js/auto`, pero a costa de importar todo.
3. **Sin canvas, sin resize handlers.** Recharts usa SVG con `ResponsiveContainer`. CSS-driven responsive. Chart.js necesita `chart.resize()` cuando cambia el viewport — más código y más bugs de render en mobile.
4. **Composición JSX para customización.** El tooltip, las celdas por categoría y los axes custom son componentes React. En Chart.js son callbacks con tipado débil.
5. **SSR-friendly por construcción.** Funciona con la pipeline de Astro sin hacks. Chart.js necesita `chartSetup.ts` adicional para SSR-safe.

El único punto donde Chart.js ganaría es en datasets con miles de puntos (canvas > SVG para 10k+ puntos). Un dashboard PyME con 96 meses y 731 días nunca entra en esa zona.

### Por qué React (no Preact)

Recharts depende de React. Para los otros 9 proyectos del portfolio usé Preact por su footprint ~3KB. Aquí Recharts solo aporta ~50KB gzipped, vs ~150KB gzipped de `react + react-dom`. Pero en este proyecto la isla ya carga Recharts, así que el ahorro marginal de Preact se diluye. Decisión: **mantener React** para evitar configurar `preact/compat` aliases que rompan en alguna versión de Recharts.

### Por qué Tailwind v4 sin `tailwind.config.js`

Tailwind v4 lee tokens directamente del `@theme {}` en el CSS. Esto evita el archivo de configuración JS y deja la paleta y las fuentes del cliente ficticio **junto al CSS que las consume**. El archivo `astro.config.mjs` sólo registra `@tailwindcss/vite` como plugin de Vite.

### Consistencia de datos (T10.16)

```ts
// buildComparison consume el MISMO getVentasPorPeriodo que el LineChart:
export function buildComparison(periodo: Periodo, customRange: RangoVentas): PeriodComparison {
  const rangoActual = getPeriodRange(periodo, customRange);
  const filasActual = getVentasPorPeriodo(rangoActual.desde, rangoActual.hasta);
  // ventasTotal = suma de filasActual (mismas que renderiza el chart)
  ...
}
```

Verificación empírica con `node scripts/verify-consistency.mjs`:

```
— Período: ultimos_6 (2025-07 → 2025-12) —
  suma del LineChart   : $ 35.170.000
  ventasTotal KPI      : $ 35.170.000
  consistencia K=V     : OK

— Período: ultimo_anio (2025-01 → 2025-12) —
  suma del LineChart   : $ 62.730.000
  ventasTotal KPI      : $ 62.730.000
  consistencia K=V     : OK
```

### Por qué Bunny Fonts (no Google Fonts)

Bunny Fonts es un mirror de Google Fonts sin tracking ni rate-limiting agresivo. Tiene los mismos archivos (`Inter`, `JetBrains Mono`) y respeta `display=swap`. Importado con `<link rel="preconnect">` para no pagar RTT extra.

## Accesibilidad

| Ítem | Implementación |
|---|---|
| Skip link | `<a href="#main-content">Saltar al dashboard</a>`, primero en `<body>`, visible sólo al recibir foco por teclado. |
| Selector de período | `role="group" aria-label="Período del reporte"`. Cada botón tiene `aria-pressed={true|false}`. |
| Gráficos | `role="img"` + `aria-label` con resumen humano (número de puntos, valor máximo, período). Las 9 charts tienen aria-label, los 5 que faltaban se agregaron en M10.1.4. |
| KPI cards | `aria-label` con label + valor + texto de variación ("Variación positiva 27.1 por ciento"). El badge lleva prefijo `+`/`−` además del color — no depende sólo del contraste. |
| Contraste | `var(--color-ink) #E8ECEF` sobre `var(--color-surface) #0F1419` da **15.8:1** (AAA). `var(--color-ink-2) #94A3B8` da **7.07:1** (AAA). `var(--color-success) #10B981` sobre dark da **7.93:1** (AAA). |
| `prefers-reduced-motion` | Honrado globalmente en `global.css` — todas las transitions y animations caen a 0.01ms. |
| Foco visible | `*:focus-visible` con outline `var(--color-accent)` azul `#3B82F6` y offset 2px. |
| Tabular numerals | La clase `.tabular` (JetBrains Mono + `tabular-nums`) se aplica a todos los valores numéricos y a los axis labels — evita que las cifras salten al cambiar de período. |

## Performance

- **Una sola isla** (`<Dashboard client:visible />` o equivalente por vista). El resto de la página es HTML estático.
- **`client:visible`** en vez de `client:load` — el bundle de Recharts (~80KB gzipped) sólo se carga cuando el dashboard entra al viewport. En mobile-first el primer paint nunca espera al JS.
- **SVGs inline** para todos los iconos y el favicon (sin requests adicionales, sin PNGs).
- **Bunny Fonts con `display=swap`** — la página renderiza con fallback y el swap es imperceptible.
- **Sin imágenes externas.** Logo, iconos y favicon son SVG inline.
- **Tailwind v4** con `@theme` no genera el archivo `tailwind.config.js` — un archivo menos y un paso de build menos.
- **JSON estático** importado con `import ventasData from '../data/ventas.json'` — Vite lo inline-a en el bundle del cliente. ~1.2MB en total (96 meses + 731 días + 80 clientes).

## Criterio de aceptación

- ✅ Al menos 2 tipos de gráfico distintos (9 charts en total — líneas, áreas, barras, donut, radar, scatter, waterfall, heatmap, comparación).
- ✅ Datos consistentes entre sí — `ventasTotal(KPI) === Σ ventasTotal(LineChart)` para todos los períodos (ver `scripts/verify-consistency.mjs`).
- ✅ Filtro por período funcional (`Últimos 6 meses` / `Último año` / `Todo` / `Personalizado`).
- ✅ 96 meses de datos seed con variacion signed vs mes anterior.
- ✅ 32 productos en 6 categorías con margen.

## Disclaimer

Esta es una **demo con datos simulados**. Los importes en ARS, los productos, los volúmenes de venta y los porcentajes de margen son ficticios — generados para reproducir la forma y la densidad de un dashboard real, no para representar información comercial de la Ferretería Central ni de ninguna empresa real.

No hay backend, no hay base de datos, no hay endpoint. La "interactividad" es React hidratando un cliente que ya trae los datos compilados en el HTML.

Cualquier parecido con ventas, productos o PyMEs reales es coincidencia.