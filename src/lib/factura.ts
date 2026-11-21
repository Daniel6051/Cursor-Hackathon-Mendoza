// src/lib/factura.ts
import { MENDOZA, OMS } from './constants';

export type DatosFactura = {
  medido: boolean; // la factura muestra consumo medido?
  consumoM3: number | null; // m3 del periodo (si es medido)
  dias: number | null; // dias del periodo
  monto: number | null; // importe total
};

// litros por persona por dia a partir de la factura
export const lPersonaDia = (f: DatosFactura, personas: number) =>
  f.medido && f.consumoM3 && f.dias
    ? Math.round((f.consumoM3 * 1000) / f.dias / Math.max(1, personas))
    : null;

export type Veredicto = 'bien' | 'medio' | 'alto';

/** Cómo estás contra la OMS (250) y el promedio de Mendoza (400). */
export function veredicto(real: number): Veredicto {
  if (real <= OMS) return 'bien';
  if (real <= MENDOZA) return 'medio';
  return 'alto';
}

/**
 * Diferencia entre lo que dice la factura y lo que explican los hábitos.
 * Si la factura marca bastante más, hay agua que nadie está contando: posible pérdida.
 */
export function brecha(real: number, estimado: number) {
  const litros = real - estimado;
  const pct = estimado > 0 ? litros / estimado : 0;
  if (litros >= 30 && pct >= 0.2) return { tipo: 'perdida' as const, litros };
  if (litros <= -30 && pct <= -0.2) return { tipo: 'sobreestimado' as const, litros: -litros };
  return { tipo: 'coincide' as const, litros: Math.abs(litros) };
}

/** $ por m3 según la factura (aproximado: incluye cargos fijos). */
export function precioM3(f: DatosFactura): number | null {
  return f.medido && f.monto && f.consumoM3 ? f.monto / f.consumoM3 : null;
}

/** Plata por mes que te ahorrarías bajando al nivel de la OMS. */
export function ahorroMensualOMS(real: number, personas: number, precio: number): number {
  const litrosDeMas = Math.max(0, real - OMS) * Math.max(1, personas) * 30;
  return Math.round((litrosDeMas / 1000) * precio);
}
