# AGENTS — 10-dashboard-ventas

Dashboard dark-mode para Ferretería Central (PyME ficticia). SSG con una sola isla React que monta Recharts. Datos seed en `src/data/ventas.json` (12 meses) y `src/data/productos.json` (20 SKUs). El selector de período (`ultimos_6` / `ultimo_anio` / `todo`) está en `src/components/PeriodoSelector.tsx` y filtra los datos que `getKPIs` y el `GraficoLineas` consumen — eso garantiza la consistencia KPI == suma del chart (T10.16). Verificar con `node scripts/verify-consistency.mjs`.

**Stack cerrado:** astro@^7, @astrojs/react, react@^19, tailwindcss@^4 vía `@tailwindcss/vite`, recharts. Sin Preact, sin Phosphor/lucide, sin Chart.js. Tipografías Inter + JetBrains Mono vía Bunny Fonts. No agregar dependencias sin discutirlo.