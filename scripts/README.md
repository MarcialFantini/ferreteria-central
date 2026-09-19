# Scripts

Scripts de utilidad para generación y validación de datos del dashboard.

| Script | Estado | Propósito |
|---|---|---|
| `verify-consistency.mjs` | vigente | Verifica que la suma de ventas por período (KPIs) coincide con la suma de las series del chart. Es la guarda de la regla T10.16 (consistencia KPI ↔ chart). |
| `generate-data.mjs` | vigente | Regenera `src/data/pedidos.json`, `src/data/productos.json`, `src/data/categorias.json`, `src/data/clientes.json`, `src/data/ventas.json`, `src/data/ventas-diarias.json`. |

## Reglas operativas

- **Después de tocar `src/data/`**: correr `node scripts/verify-consistency.mjs`. Si falla, NO commitear.
- **Para regenerar todos los seeds**: `node scripts/generate-data.mjs && node scripts/verify-consistency.mjs`.

## Histórico (`scripts/_archive/`)

Scripts del bootstrap inicial que ya no se ejecutan pero se conservan como evidencia del proceso de armado del dataset. **No borrar** — son historia del proyecto.

| Archivo histórico | Para qué se usó |
|---|---|
| `generate-sales.mjs` | Primera versión de generación de ventas. Reemplazado por `generate-data.mjs` que produce los seis archivos en un solo paso. |
| `analyze.mjs` | Contaba apariciones de `\uFFFD` en `src/`. Útil durante el encoding-fix (208 → 0 FFFD). |
| `check-encoding.mjs` | Validación ad-hoc de encoding por archivo. |
| `fix-encoding.mjs` | Primera versión de la limpieza de FFFD. Insuficiente para algunos patrones (e.g. `Ferreter` + FFFD + `a`), reemplazado por v2-v5 archivados. |
| `fix-periodo.mjs` | Renombró campos del selector de período (de `PeriodoSelector` a `DateRangeBar`). |
| `patch.mjs` | Parche quirúrgico usado durante la migración. |
| `remaining-contexts.mjs` | Reportaba contextos donde quedaban FFFD residuales. |
| `write-clientes.mjs` | Bootstrap del JSON de clientes. |
| `write-pages.mjs` | Primera generación de páginas Astro. |
| `write-pages2.mjs` | Segunda iteración de páginas. |
| `fix-encoding-v2.mjs` | Segunda versión de la limpieza de FFFD. |
| `fix-encoding-v3.mjs` | Tercera versión (corrige el patrón "ú-run" corrupción). |
| `fix-encoding-v4.mjs` | Cuarta versión (nombres, productos, UI). |
| `fix-encoding-v5.mjs` | Quinta versión (últimos edge cases — em-dash en placeholders, Tom·as Báez). |
| `fix-palette.mjs` | Reemplazo masivo de `#6366F1` → `#3B82F6` (38 ocurrencias). |
| `fix-emdash.mjs` | Reemplazo de separadores `?` ASCII por `—` em-dash en template literals. |
| `find-question.mjs` | Detector de `?` ASCII usados como separador en template literals. |
| `find-question2.mjs` | Variante del detector anterior. |