export type Habitos = {
  personas: number;
  duchaMin: number; duchasPorDia: number; duchaAhorradora: boolean;
  descargasPorPersona: number; inodoroDobleDescarga: boolean;
  lavarropasPorSemana: number;
  platosPorDia: number;
  riegoMinPorSemana: number;
  autoLavadosPorMes: number;
  canillasQueGotean: number;
};

export type Desglose = Record<'ducha' | 'inodoro' | 'lavarropas' | 'platos'
  | 'riego' | 'auto' | 'perdidas', number>; // litros por persona por dia

export type Resultado = { desglose: Desglose; totalLPersonaDia: number };

// lo implementa B en src/lib/calculo.ts:
export declare function calcular(h: Habitos): Resultado;
