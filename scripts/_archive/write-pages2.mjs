import fs from 'node:fs';
import { Buffer } from 'node:buffer';

// Build content as raw bytes with explicit UTF-8 to avoid PowerShell char corruption.
const EMDASH = Buffer.from([0xE2, 0x80, 0x94]); // UTF-8 of em-dash
const EMDASH_STR = EMDASH.toString('utf8');

function buildPage(title, description, activeKey, pageTitle, pageDescription, vistaName) {
  const t = title.replace(/--/g, EMDASH_STR);
  const d = description.replace(/--/g, EMDASH_STR);
  return `---
import Layout from '../layouts/Layout.astro';
import Page from '../components/Page';
import ${vistaName} from '../components/vistas/${vistaName}';

const title = ${JSON.stringify(t)};
const description = ${JSON.stringify(d)};
---
<Layout title={title} description={description}>
  <Page
    activeKey="${activeKey}"
    title=${JSON.stringify(pageTitle)}
    description=${JSON.stringify(pageDescription)}
  >
    <${vistaName} />
  </Page>
</Layout>
`;
}

const pages = {
  'src/pages/index.astro': `---
import Layout from '../layouts/Layout.astro';
import Page from '../components/Page';
import VistaInicio from '../components/vistas/VistaInicio';

const title = 'Ferretería Central ${EMDASH_STR} Dashboard de ventas';
const description = 'Dashboard dark-mode premium de Ferretería Central: KPIs, top productos, categorías y comparativa de períodos sobre 8 años de ventas simuladas.';

const tourSteps = [
  { target: 'kpis-grid', title: 'Tus KPIs', body: 'Estas tarjetas resumen el período activo. Hacé click en cualquiera para abrir el desglose mensual.', placement: 'bottom' },
  { target: 'ventas-chart', title: 'Visualizaciones', body: 'Cada gráfico se puede filtrar por período. La línea indigo es la facturación por mes.', placement: 'right' },
  { target: 'comparacion-chart', title: 'Comparar con el previo', body: 'Acá ves el período actual superpuesto con el anterior ${EMDASH_STR} ideal para detectar estacionalidad.', placement: 'left' },
  { target: undefined, title: 'Más vistas', body: 'Desde el sidebar podés navegar a /ventas (listado), /productos (catálogo), /clientes (RFM) y /tendencias (heatmap, radar, waterfall).', placement: 'center' },
];
---
<Layout title={title} description={description}>
  <Page
    activeKey="inicio"
    title="Dashboard de ventas"
    description="Visualizá el desempeño de Ferretería Central mes a mes: facturación, ticket promedio, variación anual y los productos que más ingresos generan."
    showTour={true}
    tourSteps={tourSteps}
    badges={{ ventas: 'Nuevo', tendencias: 'Pro' }}
  >
    <VistaInicio />
  </Page>
</Layout>
`,
};

for (const [path, content] of Object.entries(pages)) {
  fs.writeFileSync(path, content, { encoding: 'utf8' });
  console.log('wrote', path);
}
