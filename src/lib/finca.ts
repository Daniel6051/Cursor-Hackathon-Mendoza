export type Cultivo = 'Vid' | 'Olivo' | 'Frutales' | 'Huerta';
export type MetodoRiego = 'Manto' | 'Surco' | 'Goteo';

export type DatosFinca = {
  cultivo: Cultivo | '';
  superficieHa: number;
  metodoRiego: MetodoRiego | '';
  consumoMensualM3: number;
};

export type ResultadoFinca = {
  datosValidos: boolean;
  consumoActualM3: number;
  consumoConGoteoM3: number;
  aguaAhorradaM3: number;
  porcentajeAhorro: number;
  personasAbastecidas: number;
  yaUtilizaGoteo: boolean;
};

export const EFICIENCIAS_RIEGO_ESTIMADAS: Record<MetodoRiego, number> = {
  Manto: 0.6,
  Surco: 0.7,
  Goteo: 0.9,
};

export const SUPUESTO_CONSUMO_MENSUAL_POR_PERSONA_M3 = 12;

export const NOTA_METODOLOGICA =
  'Estimación aproximada con eficiencias promedio publicadas para Mendoza.';

export const NOTA_SUPUESTOS =
  'Eficiencias y consumo por persona son parámetros estimativos, no una medición oficial.';

function resultadoInvalido(): ResultadoFinca {
  return {
    datosValidos: false,
    consumoActualM3: 0,
    consumoConGoteoM3: 0,
    aguaAhorradaM3: 0,
    porcentajeAhorro: 0,
    personasAbastecidas: 0,
    yaUtilizaGoteo: false,
  };
}

function esPositivo(valor: number): boolean {
  return Number.isFinite(valor) && valor > 0;
}

export function calcularFinca(d: DatosFinca): ResultadoFinca {
  if (
    !d.cultivo ||
    !d.metodoRiego ||
    !esPositivo(d.superficieHa) ||
    !esPositivo(d.consumoMensualM3)
  ) {
    return resultadoInvalido();
  }

  const consumoActualM3 = Math.round(d.consumoMensualM3);
  if (consumoActualM3 <= 0) {
    return resultadoInvalido();
  }

  const eficienciaActual = EFICIENCIAS_RIEGO_ESTIMADAS[d.metodoRiego];
  const eficienciaGoteo = EFICIENCIAS_RIEGO_ESTIMADAS.Goteo;
  const factor = Math.min(1, eficienciaActual / eficienciaGoteo);

  const consumoConGoteoM3 = Math.round(consumoActualM3 * factor);
  const aguaAhorradaM3 = Math.max(0, consumoActualM3 - consumoConGoteoM3);
  const porcentajeAhorro = Math.round((aguaAhorradaM3 / consumoActualM3) * 100);
  const personasAbastecidas = Math.round(
    aguaAhorradaM3 / SUPUESTO_CONSUMO_MENSUAL_POR_PERSONA_M3,
  );

  return {
    datosValidos: true,
    consumoActualM3,
    consumoConGoteoM3,
    aguaAhorradaM3,
    porcentajeAhorro,
    personasAbastecidas,
    yaUtilizaGoteo: d.metodoRiego === 'Goteo',
  };
}
