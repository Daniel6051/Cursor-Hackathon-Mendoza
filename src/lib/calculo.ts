import type { Habitos, Desglose, Resultado } from '../types';
import {
  CAUDAL_DUCHA, CAUDAL_DUCHA_AHORRADORA,
  LITROS_DESCARGA, LITROS_DESCARGA_DOBLE,
  LITROS_LAVARROPAS, LITROS_PLATOS, LITROS_RIEGO_POR_MIN,
  LITROS_AUTO, LITROS_CANILLA_GOTEANDO, DIAS_SEMANA, DIAS_MES,
} from './constants';

export { MENDOZA, OMS } from './constants';

// Función pura: litros por persona por día, redondeado a enteros.
export function calcular(h: Habitos): Resultado {
  const p = Math.max(1, h.personas); // evita dividir por 0

  const caudal = h.duchaAhorradora ? CAUDAL_DUCHA_AHORRADORA : CAUDAL_DUCHA;
  const litrosDescarga = h.inodoroDobleDescarga ? LITROS_DESCARGA_DOBLE : LITROS_DESCARGA;

  const desglose: Desglose = {
    ducha: Math.round(h.duchaMin * caudal * h.duchasPorDia),
    inodoro: Math.round(h.descargasPorPersona * litrosDescarga),
    lavarropas: Math.round((h.lavarropasPorSemana * LITROS_LAVARROPAS) / DIAS_SEMANA / p),
    platos: Math.round((h.platosPorDia * LITROS_PLATOS) / p),
    riego: Math.round((h.riegoMinPorSemana * LITROS_RIEGO_POR_MIN) / DIAS_SEMANA / p),
    auto: Math.round((h.autoLavadosPorMes * LITROS_AUTO) / DIAS_MES / p),
    perdidas: Math.round((h.canillasQueGotean * LITROS_CANILLA_GOTEANDO) / p),
  };

  // El total es la suma del desglose redondeado, así el gráfico siempre cierra.
  const totalLPersonaDia = Object.values(desglose).reduce((a, b) => a + b, 0);
  return { desglose, totalLPersonaDia };
}
