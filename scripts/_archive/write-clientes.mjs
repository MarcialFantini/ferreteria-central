import fs from 'node:fs';
const content = String.raw`---
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
`;
fs.writeFileSync('src/pages/clientes.astro', content);
console.log('written');
