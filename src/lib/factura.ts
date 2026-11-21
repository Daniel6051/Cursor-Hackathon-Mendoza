// src/lib/factura.ts
import { MENDOZA, OMS } from './constants';

export type DatosFactura = {
  medido: boolean; // la factura muestra consumo medido?
  consumoM3: number | null; // m3 del periodo (si es medido)
  dias: number | null; // dias del periodo
  monto: number | null; // importe total
  /** Factura no medida: m3 que la tarifa presume/incluye por superficie, si figura. */
  consumoPresuntoM3?: number | null;
};

/** De dónde sale el consumo de la factura. */
export type Fuente = 'medido' | 'presunto' | null;

/** Lo que devuelve /api/factura: nada de esto se guarda. */
export type AnalisisFactura = {
  medido: boolean; // si es medida pero no se leyeron los m3, el front pide carga manual
  fuente: Fuente;
  litrosFactura: number | null; // L por persona por día según la factura (medido o presunto)
  feedback: { titulo: string; puntos: string[] };
};

const DIAS_POR_DEFECTO = 60; // las facturas de agua en Mendoza suelen ser bimestrales

// litros por persona por dia a partir de la factura
export const lPersonaDia = (f: DatosFactura, personas: number) =>
  f.medido && f.consumoM3 !== null && Number.isFinite(f.consumoM3) && f.consumoM3 >= 0 && f.dias && f.dias > 0
    ? Math.round((f.consumoM3 * 1000) / f.dias / Math.max(1, personas))
    : null;

/** Consumo de la factura: medido si lo hay; si no, el que presume la tarifa por superficie. */
export function consumoFactura(f: DatosFactura, personas: number): { fuente: Fuente; litros: number | null } {
  const medido = lPersonaDia(f, personas);
  if (medido !== null) return { fuente: 'medido', litros: medido };
  if (!f.medido && f.consumoPresuntoM3 != null && Number.isFinite(f.consumoPresuntoM3) && f.consumoPresuntoM3 >= 0) {
    const dias = f.dias ?? DIAS_POR_DEFECTO;
    return { fuente: 'presunto', litros: Math.round((f.consumoPresuntoM3 * 1000) / dias / Math.max(1, personas)) };
  }
  return { fuente: null, litros: null };
}

export type Veredicto = 'bien' | 'medio' | 'alto';

/** Cómo estás contra la OMS (250) y el promedio de Mendoza (400). */
export function veredicto(litros: number): Veredicto {
  if (litros <= OMS) return 'bien';
  if (litros <= MENDOZA) return 'medio';
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

/** Pesos por persona por mes (aprox.), para dar contexto sin repetir el total de la factura. */
export function pesosPersonaMes(f: DatosFactura, personas: number): number | null {
  if (!f.monto) return null;
  const dias = f.dias ?? DIAS_POR_DEFECTO;
  return Math.round((f.monto / Math.max(1, personas)) * (30 / dias));
}

/** Devolución sin IA (plan B): misma idea, texto fijo. */
export function feedbackFijo(fuente: Fuente, litros: number | null, estimado: number): AnalisisFactura['feedback'] {
  if (litros === null) {
    return {
      titulo: 'Tu factura se cobra por superficie, no por lo que gastás',
      puntos: [
        `Por eso no muestra tu consumo real. Según tus hábitos gastás unos ${estimado} L por persona por día.`,
        estimado > OMS
          ? `Estás ${estimado - OMS} L arriba de lo que recomienda la OMS: hoy no lo pagás, pero con medidor sí se pagaría.`
          : 'Estás dentro de lo que recomienda la OMS: si te pusieran medidor, probablemente pagarías menos.',
      ],
    };
  }
  const b = brecha(litros, estimado);
  const base = fuente === 'presunto' ? 'La tarifa te cobra como si gastaras' : 'Tu factura marca';
  const puntos = [`${base} unos ${litros} L por persona por día; tus hábitos dan ${estimado} L.`];
  if (fuente === 'medido' && b.tipo === 'perdida') {
    puntos.push(`Hay ${b.litros} L por día que tus hábitos no explican: puede ser una pérdida. Cerrá todas las canillas y mirá si el medidor sigue girando.`);
  } else if (fuente === 'presunto' && litros > estimado) {
    puntos.push('Pagás por más agua de la que usás: un medidor podría bajarte la factura.');
  } else if (fuente === 'presunto') {
    puntos.push('Usás más agua de la que te cobran: con medidor, la factura subiría. Los consejos de abajo ayudan.');
  }
  const v = veredicto(fuente === 'medido' ? litros : estimado);
  const titulo = v === 'bien' ? 'Vas bien: estás dentro de lo que recomienda la OMS'
    : v === 'medio' ? 'Estás bajo el promedio de Mendoza, pero arriba de la OMS'
    : 'Gastás más que el promedio de Mendoza';
  return { titulo, puntos };
}
