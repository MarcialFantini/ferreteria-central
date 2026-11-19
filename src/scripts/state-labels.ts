// Labels shared by the server-rendered pages and the client state (no side effects here).
export type Metric = 'order_total' | 'today_revenue' | 'province_orders' | 'seller_goal';

export const METRIC_LABEL: Readonly<Record<Metric, string>> = {
  order_total: 'Pedido individual mayor a',
  today_revenue: 'Facturación de hoy supera',
  province_orders: 'Pedidos de hoy en la provincia superan',
  seller_goal: 'Avance del objetivo mensual supera (%)',
};
