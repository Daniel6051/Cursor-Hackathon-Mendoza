import type { Desglose, Habitos, Resultado } from '../types';

export type Uso = keyof Desglose;

export type Consejo = {
  uso: Uso;
  titulo: string;
  detalle: string;
  /** Litros por persona por día que se ahorran. Lo calcula calcular() de B, nunca la IA. */
  ahorroLitros?: number;
};

export const CONSEJOS_FIJOS: Record<Uso, Omit<Consejo, 'uso'>> = {
  ducha: {
    titulo: 'Bajá 2 minutos la ducha',
    detalle: 'Poné una alarma en el celu o una canción de 5 minutos. Cerrá la canilla mientras te enjabonás.',
  },
  inodoro: {
    titulo: 'Poné una botella en la mochila',
    detalle: 'Una botella de 1 litro llena de agua dentro del depósito ahorra agua en cada descarga. Si podés, pasate a doble descarga.',
  },
  lavarropas: {
    titulo: 'Lavarropas solo con carga completa',
    detalle: 'Juntá la ropa y usalo con el tambor lleno. Usá el programa corto o económico cuando la ropa no está muy sucia.',
  },
  platos: {
    titulo: 'Lavá los platos con la pileta tapada',
    detalle: 'Llená la bacha con agua y detergente y enjuagá todo junto al final, en vez de dejar la canilla abierta.',
  },
  riego: {
    titulo: 'Regá de noche o temprano',
    detalle: 'Regá antes de las 8 o después de las 20 para que no se evapore. Respetá el turno de riego y usá riego por goteo si podés.',
  },
  auto: {
    titulo: 'Lavá el auto con balde, no con manguera',
    detalle: 'Con dos baldes y una esponja usás una fracción del agua de una manguera abierta. O usá un lavadero que recicle el agua.',
  },
  perdidas: {
    titulo: 'Arreglá las canillas que gotean',
    detalle: 'Una canilla que gotea tira miles de litros por año. Un cuerito nuevo sale poco y lo cambiás en 10 minutos.',
  },
};

/** Los usos ordenados de mayor a menor consumo. */
export function topUsos(resultado: Resultado, n = 3): Uso[] {
  return (Object.entries(resultado.desglose) as [Uso, number][])
    .filter(([, litros]) => litros > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([uso]) => uso);
}

/** Consejos fijos de los 3 usos con más litros. Nunca devuelve vacío. */
export function consejosFallback(resultado: Resultado): Consejo[] {
  let usos = topUsos(resultado);
  if (usos.length === 0) usos = ['ducha', 'inodoro', 'perdidas'];
  return usos.map((uso) => ({ uso, ...CONSEJOS_FIJOS[uso] }));
}

/**
 * Hábitos "mejorados" según el consejo de cada uso. Se le pasa a calcular() de B
 * y la diferencia de litros es el ahorro que se muestra (la IA no calcula números).
 */
export function aplicarConsejo(uso: Uso, h: Habitos): Habitos {
  switch (uso) {
    case 'ducha':
      return { ...h, duchaMin: Math.max(1, h.duchaMin - 2) };
    case 'inodoro':
      return { ...h, inodoroDobleDescarga: true };
    case 'lavarropas':
      return { ...h, lavarropasPorSemana: Math.max(0, h.lavarropasPorSemana - 1) };
    case 'platos':
      return { ...h, platosPorDia: Math.max(0, h.platosPorDia - 1) };
    case 'riego':
      return { ...h, riegoMinPorSemana: Math.round(h.riegoMinPorSemana * 0.7) };
    case 'auto':
      return { ...h, autoLavadosPorMes: Math.max(0, h.autoLavadosPorMes - 1) };
    case 'perdidas':
      return { ...h, canillasQueGotean: 0 };
  }
}
