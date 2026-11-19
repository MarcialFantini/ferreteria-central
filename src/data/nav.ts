export interface NavItem {
  href: string;
  label: string;
  icon: 'resumen' | 'vivo' | 'clientes' | 'productos' | 'vendedores' | 'pedidos' | 'objetivos' | 'alertas';
  /** Keyboard shortcut: "g" then this key. */
  key: string;
  mobile?: boolean;
}

export const NAV: readonly NavItem[] = [
  { href: '/', label: 'Resumen', icon: 'resumen', key: 'r', mobile: true },
  { href: '/en-vivo', label: 'En vivo', icon: 'vivo', key: 'l', mobile: true },
  { href: '/clientes', label: 'Clientes', icon: 'clientes', key: 'c', mobile: true },
  { href: '/productos', label: 'Productos', icon: 'productos', key: 'p' },
  { href: '/vendedores', label: 'Vendedores', icon: 'vendedores', key: 'v' },
  { href: '/pedidos', label: 'Pedidos', icon: 'pedidos', key: 'o', mobile: true },
  { href: '/objetivos', label: 'Objetivos', icon: 'objetivos', key: 'g' },
  { href: '/alertas', label: 'Alertas', icon: 'alertas', key: 'a' },
];
