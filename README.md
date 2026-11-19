# Mayorista Central · Plataforma de ventas (Demo)

Demo de portfolio: una plataforma de ventas para **Mayorista Central**, un mayorista ficticio de Córdoba, Argentina.
Tiene varias vistas, filtros globales, objetivos y alertas editables, y una **simulación en vivo** que hace entrar pedidos en tiempo real.

> Marca y datos ficticios. No hay backend, APIs, base de datos ni servicios externos: todo corre en el navegador.

## Stack

- Astro 7 (salida 100 % estática, 214 páginas) con `ClientRouter`: navegación sin recarga y transiciones entre vistas
- TypeScript estricto (`astro/tsconfigs/strictest`)
- CSS con variables (vista **noche** y vista **papel**, un solo acento por vista)
- GSAP 3 (core + ScrollTrigger) para el movimiento
- Gráficos hechos a mano en SVG; `d3-scale` / `d3-shape` solo para escalas y curvas
- Barlow Condensed + Barlow, autoalojadas con Fontsource

## Cómo correrlo

Requisitos: Node 22.12+ y pnpm.

```bash
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # genera dist/
pnpm preview    # sirve dist/
pnpm check      # chequeo de tipos (astro check)
```

## Vistas

| Ruta | Qué hay |
| --- | --- |
| `/` **Resumen** | Las cinco escenas: odómetro de facturación, mapa de Argentina con zoom a clientes, interanual, carrera de productos y cohortes. Los pedidos en vivo caen sobre el mapa. |
| `/en-vivo` **En vivo** | Facturación de hoy subiendo en tiempo real, curva "hoy contra ayer", mapa con los pedidos que entran, feed de pedidos, productos y vendedores del día, pausa y velocidad. |
| `/clientes` **Clientes** | Tabla con búsqueda, orden por columna, filtro por riesgo y exportación CSV. |
| `/clientes/[id]` | Ficha de cada uno de los 200 clientes: historial de 24 meses, productos que más compra, pedidos recientes, pedidos de hoy en vivo y riesgo de abandono. |
| `/productos` **Productos** | Curva ABC (Pareto), margen, variación y bultos; detalle de cada producto en un panel lateral. |
| `/vendedores` **Vendedores** | Ranking del período con anillos de avance contra el objetivo del mes, en vivo. |
| `/vendedores/[id]` | Ficha del vendedor: objetivo editable, proyección de cierre, territorio con pedidos en vivo y mejores clientes. |
| `/pedidos` **Pedidos** | Pedidos de hoy (en vivo, arriba) y de los últimos tres meses, con filtros, detalle del pedido y exportación CSV. |
| `/objetivos` **Objetivos** | Objetivos mensuales editables por vendedor, avance del equipo, proyección y estado. |
| `/alertas` **Alertas** | Reglas con umbral (pedido grande, facturación del día, pedidos por provincia, avance del objetivo): crear, activar, eliminar y ver cómo se disparan. |

## Lo que es compartido entre vistas

- **Filtros globales** (barra superior; en mobile, botón de filtro): período, vendedor y provincia. Todas las vistas responden.
- **Vistas guardadas** (barra lateral): guardá una combinación de filtros y volvé a ella con un clic.
- **Estado persistente**: filtros, vistas, objetivos, reglas, notificaciones y el reloj de la simulación se guardan en `localStorage`. **Reiniciar demo** (barra lateral o buscador) borra todo.
- **Simulación en vivo**: un único motor (`src/scripts/engine.ts`) avanza un reloj simulado. A 1x, un minuto simulado por segundo real (un día hábil de 8 a 20 h dura 12 minutos); también 4x y 10x, y pausa. Cada día tiene su propio flujo determinista de pedidos (`src/data/live.ts`), así que se puede retomar donde quedó.
- **Notificaciones**: las reglas de alerta generan avisos (toasts), la campana muestra un contador de no leídas y el centro de notificaciones guarda el historial.

## Atajos

| Tecla | Acción |
| --- | --- |
| `Ctrl/⌘ + K` | Buscador de comandos: clientes, productos, provincias, vendedores, vistas y acciones |
| `/` | Buscar dentro de la vista |
| `g` y luego `r l c p v o g a` | Ir a Resumen, En vivo, Clientes, Productos, Vendedores, Pedidos, Objetivos, Alertas |
| `.` | Pausar o reanudar la simulación |
| `1` `4` `0` | Velocidad 1x, 4x, 10x |
| `t` | Vista noche / papel |
| `n` | Notificaciones |
| `?` | Ayuda de atajos |

**Modo presentación** (botón de pantalla completa, en Resumen): las flechas avanzan entre escenas, `Esc` sale.
**Exportar** (botón de descarga): PNG del gráfico activo, generado en un `<canvas>` del navegador.

## Modo vitrina y cómo grabarlo

Abrí cualquier ruta con `?showcase`:

```
http://localhost:4321/?showcase
```

Recorre solo el producto en un loop de unos 24 segundos, sin cursor ni controles: el odómetro del Resumen, el mapa con zoom a Córdoba, En vivo a 10x (con alertas disparándose), Clientes, la ficha del mejor cliente, Vendedores y Productos. Para salir, recargá la página sin `?showcase`.

Para grabar:

1. `pnpm build && pnpm preview` (o la URL publicada) y abrí `/?showcase` en una ventana de 1600×900 o 1920×1080.
2. Si querés empezar limpio, usá una ventana privada (el estado guardado no interfiere).
3. Grabá con OBS, la grabación de pantalla del sistema o la de Chrome DevTools. Cortá 10 s o un loop completo.

## Póster

`public/poster.jpg` (1600×900) se captura de la página real con Playwright:

```bash
pnpm build
node scripts/capture.mjs poster
pnpm build   # para que el póster nuevo quede en dist/
```

La primera vez hace falta el navegador de Playwright: `pnpm exec playwright install chromium`.

## Datos

`src/data/` genera todo con una semilla fija (`mulberry32`, `SEED` en `dataset.ts`):

- 24 meses (nov 2024 – oct 2026) con estacionalidad, tendencia y eventos para que las curvas interanuales se crucen
- 200 clientes por provincia, 80 productos con precio y margen, 6 vendedores con territorio
- Historial de pedidos derivado de la facturación mensual (`history.ts`) y días en vivo de noviembre 2026 (`live.ts`)

## Mapa

`src/data/argentina-map.ts` y `src/data/argentina-geo.ts` se generan con `node scripts/build-map.mjs` a partir de
`scripts/data/argentina-adm1.geojson` (geoBoundaries gbHumanitarian ARG ADM1, fuente IGN / UNHCR, licencia CC BY 3.0 IGO).
No se descarga nada en tiempo de ejecución.

## Calidad

- Solo se anima `transform`, `opacity` y atributos SVG; las escenas y el buscador se cargan después del primer pintado.
- `prefers-reduced-motion`: versión estática completa (los valores aparecen sin animación; el flujo en vivo sigue, sin efectos).
- Mobile (390 px): barra de pestañas abajo, menú lateral deslizable, filtros en panel, tablas con columnas reducidas y gráficos re-renderizados al tamaño real.
- Navegable con teclado, foco visible y tablas como alternativa a cada gráfico de Resumen.

Utilidades de verificación (Playwright, local):

```bash
node scripts/capture.mjs flow salida                 # recorre vistas, atajos y buscador; informa errores de consola
node scripts/capture.mjs shot salida.png 390 844 "clientes" 2000
node scripts/capture.mjs frames frames/f 3000 27000  # muestrea el modo vitrina
node scripts/capture.mjs export grafico.png "#escena-3"
```
