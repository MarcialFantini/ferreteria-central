// Hooks the persisted topbar buttons ("Exportar", "Presentar") into whatever view is mounted.
import { onDispose } from './lifecycle';

export interface ExportTarget {
  el: Element;
  title: string;
  slug: string;
}

export interface ViewActions {
  exportTarget?: () => ExportTarget | null;
  present?: () => void;
  /** Scene-based views (Resumen) expose their scenes to the showcase tour. */
  scenes?: { count: number; go: (i: number) => void };
}

let current: ViewActions = {};

export function setViewActions(actions: ViewActions): void {
  current = actions;
  onDispose(() => {
    if (current === actions) current = {};
  });
}

export const viewActions = (): ViewActions => current;
