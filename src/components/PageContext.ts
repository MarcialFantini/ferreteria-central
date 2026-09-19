/**
 * Re-export del hook + helpers de PageContext.
 * Implementación basada en un store de módulo con suscripción. Funciona
 * aunque el slot de Astro sea prerenderizado a HTML en paralelo (no se
 * puede usar React.Context.Provider para propagar contexto al contenido
 * de un slot).
 */
export { usePageContext, hydratePageState, getPageState } from './usePageContext';
export type { PageContextValue } from './usePageContext';