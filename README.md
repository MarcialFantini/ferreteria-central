# 10 · Dashboard de ventas — Ferretería Central

Dashboard analítico dark-mode para una PyME de barrio ficticia ("Ferretería Central", 8 años de ventas). Muestra facturación mensual, ticket promedio, variación anual y ranking de productos por ingreso. Filtra por período (últimos 6 meses / último año / todo) sin recargar.

> **Cliente ficticio.** Los datos están simulados — ver [Disclaimer](#disclaimer).

---

## Problema

Una ferretería de barrio con 8 años de ventas tiene un sistema de facturación que registra las ventas, pero **no tiene una vista consolidada** que le permita responder preguntas simples del día a día:

- ¿Cuánto vendimos este mes vs. el anterior?
- ¿El ticket promedio está subiendo o bajando?
- ¿Qué productos generan más ingresos?
- ¿Cuál es el mejor y el peor mes del último año?

Las respuestas están en planillas y en el sistema POS, pero nadie las cruza. Un dashboard mínimo que cargue rápido, funcione en mobile y permita filtrar por período resuelve el 80% del problema sin tocar el backend del POS.

## Solución

Una página estática (Astro SSG) que monta una sola isla React con **Recharts** y datos seed. Toda la lógica de filtrado vive en el cliente, pero como los datos están compilados en el HTML, el sitio sirve sin backend y carga casi instantáneo.

- **4 KPIs** arriba: ventas totales, cantidad de pedidos, ticket promedio y variación anual — cada uno con badge de delta en color y signo.
- **LineChart** de ventas por mes con tooltip exacto en ARS.
- **BarChart** horizontal con el top 10 productos, coloreado por categoría.
- **Tabla** de detalle con margen y unidades.
- **PeriodoSelector** con 3 botones (`aria-pressed`): "Últimos 6 meses", "Último año", "Todo".

El KPI "Ventas totales" **siempre coincide** con la suma de los puntos del LineChart en el rango seleccionado — la función `getKPIs(periodo)` consume el mismo `getVentasPorPeriodo(desde, hasta)` que el gráfico.

## Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | **Astro 7.3** | SSG puro, única isla React, 0 JS para la página en reposo. |
| UI interactiva | **React 19** (vía `@astrojs/react`) | Ecosistema de charting más maduro. Único proyecto del portfolio que usa React (los demás usan Preact). |
| Charts | **Recharts 3.10** | Declarativo, tree-shaking fuerte, sin canvas/imperativo. Ver justificación abajo. |
| Estilos | **Tailwind v4** (`@tailwindcss/vite`) | Configuración con `@theme` en `src/styles/global.css` — sin `tailwind.config.js`. |
| Tipografía | **Inter** (UI) + **JetBrains Mono** (números) vía Bunny Fonts | `display=swap`, no bloquea LCP. |
| Lenguaje | **TypeScript estricto** (`astro/tsconfigs/strict`) | `astro check` en CI para 0 errores. |
| Package manager | **pnpm 11** (exclusivo) | Lockfile versionado, `node_modules` aislado por proyecto. |

## Cómo correrlo

```sh
# Requisitos: Node >=22.12, pnpm >=11
pnpm install        # instala astro, react, tailwind v4, recharts
pnpm dev            # dev server en http://localhost:4321
pnpm build          # genera dist/ (SSG, 1 página)
pnpm preview        # sirve dist/ localmente
pnpm astro check    # type-check (.astro + .ts + .tsx) — debe dar 0 errores

# Verificación extra de consistencia (T10.16):
node scripts/verify-consistency.mjs
```

El proyecto es **100% SSG** — no hay adapter de SSR, no hay endpoints. Toda la "interactividad" es React dentro de una isla.

## Estructura

```
portfolio/10-dashboard-ventas/
├── astro.config.mjs          # integrations: react() + vite plugin tailwindcss()
├── package.json              # astro 7, @astrojs/react, recharts, react 19
├── tsconfig.json             # extends astro/tsconfigs/strict
├── scripts/
│   └── verify-consistency.mjs # T10.16 — chequea KPI == suma del LineChart
├── public/
│   └── favicon.svg            # SVG inline (no PNG)
└── src/
    ├── components/
    │   ├── Header.astro              # marca + título + placeholder del selector
    │   ├── Footer.astro              # disclaimer de demo
    │   ├── Layout.astro               # SEO, fonts (Bunny), skip link
    │   ├── Dashboard.tsx             # isla orquestadora (client:visible)
    │   ├── PeriodoSelector.tsx       # 3 botones, aria-pressed
    │   ├── KPICard.tsx               # label + valor + badge de delta
    │   ├── GraficoLineas.tsx         # Recharts LineChart
    │   └── GraficoBarras.tsx         # Recharts BarChart horizontal
    ├── data/
    │   ├── ventas.json          # 12 meses, variacion vs mes previo
    │   └── productos.json       # 20 SKUs en 6 categorías
    ├── lib/
    │   └── datos.ts             # getVentasPorPeriodo / getTopProductos / getKPIs / formatARS
    ├── layouts/
    │   └── Layout.astro         # SEO base + Header + Footer
    ├── pages/
    │   └── index.astro          # hero + <Dashboard client:visible />
    ├── styles/
    │   └── global.css           # Tailwind v4 + @theme (paleta dark + tipografías)
    └── types/
        ├── venta.ts             # VentaMensual, Periodo, KPIs, RangoVentas
        └── producto.ts          # Producto, CATEGORIA_LABELS
```

## Decisiones técnicas

### Recharts vs Chart.js

**Elegido: Recharts.** Razones:

1. **API declarativa React-first.** Cada chart es un componente JSX con props. La curva de aprendizaje es la del propio React. Chart.js envuelve un canvas imperativo que requiere refs y configs mutables — más fricción al integrarlo con un sistema declarativo.
2. **Tree-shaking real.** Recharts exporta `Line`, `Bar`, `XAxis`, etc. por separado — sólo entra al bundle lo que el dashboard usa. Chart.js registra controllers/elements globales; en árbol chico se justifica con `chart.js/auto`, pero a costa de importar todo.
3. **Sin canvas, sin resize handlers.** Recharts usa SVG con `ResponsiveContainer`. CSS-driven responsive. Chart.js necesita `chart.resize()` cuando cambia el viewport — más código y más bugs de render en mobile.
4. **Composición JSX para customización.** El tooltip, las celdas por categoría y los axes custom son componentes React. En Chart.js son callbacks con tipado débil.
5. **SSR-friendly por construcción.** Funciona con la pipeline de Astro sin hacks. Chart.js necesita `chartSetup.ts` adicional para SSR-safe.

El único punto donde Chart.js ganaría es en datasets con miles de puntos (canvas > SVG para 10k+ puntos). Un dashboard PyME con 12–36 meses nunca entra en esa zona.

### Por qué React (no Preact)

Recharts depende de React. Para los otros 9 proyectos del portfolio usé Preact por su footprint ~3KB. Aquí Recharts solo aporta ~50KB gzipped, vs ~150KB gzipped de `react + react-dom`. Pero en este proyecto la isla ya carga Recharts, así que el ahorro marginal de Preact se diluye. Decisión: **mantener React** para evitar configurar `preact/compat` aliases que rompan en alguna versión de Recharts.

### Por qué Tailwind v4 sin `tailwind.config.js`

Tailwind v4 lee tokens directamente del `@theme {}` en el CSS. Esto evita el archivo de configuración JS y deja la paleta y las fuentes del cliente ficticio **junto al CSS que las consume**. El archivo `astro.config.mjs` sólo registra `@tailwindcss/vite` como plugin de Vite.

### Consistencia de datos (T10.16)

```ts
// getKPIs consume el MISMO getVentasPorPeriodo que el LineChart:
export function getKPIs(periodo: Periodo): KPIs {
  const { desde, hasta } = getPeriodRange(periodo);
  const filas = getVentasPorPeriodo(desde, hasta);
  // ventasTotal = suma de filas (mismas que renderiza el chart)
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
| Skip link | `<a href="#dashboard">Saltar al dashboard</a>`, primero en `<body>`, visible sólo al recibir foco por teclado. |
| Selector de período | `role="group" aria-label="Período del reporte"`. Cada botón tiene `aria-pressed={true|false}`. |
| Gráficos | `role="img"` + `aria-label` con resumen humano: "Gráfico de líneas mostrando ventas totales de los últimos N meses, desde X hasta Y. Rango $A a $B." |
| KPI cards | `aria-label` con label + valor + texto de variación ("Variación positiva 27.1 por ciento"). El badge lleva prefijo `+`/`−` además del color — no depende sólo del contraste. |
| Contraste | `var(--color-ink) #E8ECEF` sobre `var(--color-surface) #0F1419` da **15.8:1** (AAA). `var(--color-ink-2)` da **7.07:1** (AAA). `var(--color-success) #10B981` sobre dark da **7.93:1** (AAA). |
| `prefers-reduced-motion` | Honrado globalmente en `global.css` — todas las transitions y animations caen a 0.01ms. |
| Foco visible | `*:focus-visible` con outline `var(--color-accent)` (azul `#3B82F6`) y offset 2px. |
| Tabular numerals | La clase `.tabular` (JetBrains Mono + `tabular-nums`) se aplica a todos los valores numéricos y a los axis labels — evita que las cifras salten al cambiar de período. |

## Performance

- **Una sola isla** (`<Dashboard client:visible />`). El resto de la página es HTML estático.
- **`client:visible`** en vez de `client:load` — el bundle de Recharts (~80KB gzipped) sólo se carga cuando el dashboard entra al viewport. En mobile-first el primer paint nunca espera al JS.
- **SVGs inline** para todos los iconos y el favicon (sin requests adicionales, sin PNGs).
- **Bunny Fonts con `display=swap`** — la página renderiza con fallback y el swap es imperceptible.
- **Sin imágenes externas.** Logo, iconos y favicon son SVG inline.
- **Tailwind v4** con `@theme` no genera el archivo `tailwind.config.js` — un archivo menos y un paso de build menos.
- **JSON estático** importado con `import ventasData from '../data/ventas.json'` — Vite lo inline-a en el bundle del cliente. 12KB en total.

## Criterio de aceptación

- ✅ Al menos 2 tipos de gráfico distintos (líneas + barras).
- ✅ Datos consistentes entre sí — `ventasTotal(KPI) === Σ ventasTotal(LineChart)` para los 3 períodos (ver `scripts/verify-consistency.mjs`).
- ✅ Filtro por período funcional (`Últimos 6 meses` / `Último año` / `Todo`).
- ✅ 12 meses de datos seed con variacion signed vs mes anterior.
- ✅ 20 productos en 6 categorías con margen.

## Disclaimer

Esta es una **demo con datos simulados**. Los importes en ARS, los productos, los volúmenes de venta y los porcentajes de margen son ficticios — generados para reproducir la forma y la densidad de un dashboard real, no para representar información comercial de la Ferretería Central ni de ninguna empresa real.

No hay backend, no hay base de datos, no hay endpoint. La "interactividad" es React hidratando un cliente que ya trae los datos compilados en el HTML.

Cualquier parecido con ventas, productos o PyMEs reales es coincidencia.