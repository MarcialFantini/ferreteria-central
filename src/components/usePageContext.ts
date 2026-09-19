import { useEffect, useState } from 'react';
import type { Periodo, RangoVentas } from '../types/venta';
import { PRIMER_MES, ULTIMO_MES } from '../lib/datos';
import { readLS, writeLS } from '../lib/storage';

export interface PageContextValue {
  periodo: Periodo;
  customRange: RangoVentas;
  setPeriodo: (p: Periodo) => void;
  setCustomRange: (r: RangoVentas) => void;
}

const PERIODO_KEY = 'ferreteria-periodo';
const CUSTOM_RANGE_KEY = 'ferreteria-custom-range';
const DEFAULT_PERIODO: Periodo = 'ultimo_anio';
const DEFAULT_RANGE: RangoVentas = { desde: PRIMER_MES, hasta: ULTIMO_MES };

type Listener = () => void;
const listeners = new Set<Listener>();

interface PageState {
  periodo: Periodo;
  customRange: RangoVentas;
}
let state: PageState = {
  periodo: DEFAULT_PERIODO,
  customRange: DEFAULT_RANGE,
};

function notify() {
  for (const fn of listeners) fn();
}

function setPeriodoImpl(p: Periodo) {
  state = { ...state, periodo: p };
  writeLS(PERIODO_KEY, p);
  notify();
}

function setCustomRangeImpl(r: RangoVentas) {
  state = { ...state, customRange: r };
  writeLS(CUSTOM_RANGE_KEY, r);
  notify();
}

export function hydratePageState(): void {
  if (typeof window === 'undefined') return;
  const newPeriodo = readLS<Periodo>(PERIODO_KEY, DEFAULT_PERIODO);
  const newRange = readLS<RangoVentas>(CUSTOM_RANGE_KEY, DEFAULT_RANGE);
  let changed = false;
  if (newPeriodo !== state.periodo) {
    state = { ...state, periodo: newPeriodo };
    changed = true;
  }
  if (newRange.desde !== state.customRange.desde || newRange.hasta !== state.customRange.hasta) {
    state = { ...state, customRange: newRange };
    changed = true;
  }
  if (changed) notify();
}

export function getPageState(): Readonly<PageState> {
  return state;
}

export function usePageContext(): PageContextValue {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  return {
    periodo: state.periodo,
    customRange: state.customRange,
    setPeriodo: setPeriodoImpl,
    setCustomRange: setCustomRangeImpl,
  };
}