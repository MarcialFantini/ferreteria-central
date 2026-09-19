import fs from 'node:fs';
import { Buffer } from 'node:buffer';

// Use Buffer to write UTF-8 explicitly without console encoding issues
const pages = {
  'src/pages/index.astro': `---
import Layout from '../layouts/Layout.astro';
import Page from '../components/Page';
import VistaInicio from '../components/vistas/VistaInicio';

const title = 'Ferretería Central — Dashboard de ventas';
const description = 'Dashboard dark-mode premium de Ferretería Central: KPIs, top productos, categorías y comparativa de períodos sobre 8 años de ventas simuladas.';

const tourSteps = [
  { target: 'kpis-grid', title: 'Tus KPIs', body: 'Estas tarjetas resumen el período activo. Hacé click en cualquiera para abrir el desglose mensual.', placement: 'bottom' },
  { target: 'ventas-chart', title: 'Visualizaciones', body: 'Cada gráfico se puede filtrar por período. La línea indigo es la facturación por mes.', placement: 'right' },
  { target: 'comparacion-chart', title: 'Comparar con el previo', body: 'Acá ves el período actual superpuesto con el anterior — ideal para detectar estacionalidad.', placement: 'left' },
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
  'src/pages/ventas.astro': `---
import Layout from '../layouts/Layout.astro';
import Page from '../components/Page';
import VistaVentas from '../components/vistas/VistaVentas';

const title = 'Listado de ventas — Ferretería Central';
const description = 'Detalle de pedidos y facturación por mes para el período seleccionado. Filtros por tipo de cliente, método de pago y canal.';
---
<Layout title={title} description={description}>
  <Page
    activeKey="ventas"
    title="Listado de ventas"
    description="Detalle de pedidos individuales y la facturación mensual del rango activo. Filtrá por tipo de cliente, método de pago o canal; exportá a CSV cuando quieras."
  >
    <VistaVentas />
  </Page>
</Layout>
`,
  'src/pages/clientes.astro': `---
import Layout from '../layouts/Layout.astro';
import Page from '../components/Page';
import VistaClientes from '../components/vistas/VistaClientes';

const title = 'Clientes — Ferretería Central';
const description = 'Segmentación RFM de la cartera: Campeones, Leales, Potenciales, En riesgo y Hibernando. Recencia, frecuencia y valor monetario por cliente.';
---
<Layout title={title} description={description}>
  <Page
    activeKey="clientes"
    title="Clientes"
    description="Segmentación RFM individual de la cartera. Identificá Campeones, Leales, Potenciales, En riesgo y Hibernando."
  >
    <VistaClientes />
  </Page>
</Layout>
`,
  'src/pages/productos.astro': `---
import Layout from '../layouts/Layout.astro';
import Page from '../components/Page';
import VistaProductos from '../components/vistas/VistaProductos';

const title = 'Productos — Ferretería Central';
const description = 'Catálogo completo de SKUs: ranking por ingreso, mix por categoría, margen y participación sobre el total facturado.';
---
<Layout title={title} description={description}>
  <Page
    activeKey="productos"
    title="Productos"
    description="Top productos por ingreso, mix por categoría y catálogo completo con margen y participación."
  >
    <VistaProductos />
  </Page>
</Layout>
`,
  'src/pages/tendencias.astro': `---
import Layout from '../layouts/Layout.astro';
import Page from '../components/Page';
import VistaTendencias from '../components/vistas/VistaTendencias';

const title = 'Tendencias — Ferretería Central';
const description = 'Heatmap anual, waterfall de variaciones mensuales, scatter pedidos-vs-facturación y radar de estacionalidad. Análisis temporal profundo.';
---
<Layout title={title} description={description}>
  <Page
    activeKey="tendencias"
    title="Tendencias"
    description="Heatmap anual, waterfall de variaciones mensuales, scatter de dispersión y radar de estacionalidad para entender el pulso del negocio."
  >
    <VistaTendencias />
  </Page>
</Layout>
`,
};

for (const [path, content] of Object.entries(pages)) {
  fs.writeFileSync(path, content, { encoding: 'utf8' });
  console.log('wrote', path, '(', Buffer.byteLength(content, 'utf8'), 'bytes UTF-8)');
}
