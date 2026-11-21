export const fuentes = {
  demanda: {
    organismo: 'Departamento General de Irrigación',
    documento: 'Plan Maestro para el Sector Hídrico de Mendoza · Reporte 3',
    publicacion: 'Marzo de 2025',
    pagina: 'Sección 4.1, pág. 11 y tabla 4-1',
    urlFuente: 'https://www.irrigacion.gov.ar/web/wp-content/uploads/2025/05/Plan-Maestro-Mendoza-Reporte-3.pdf#page=12',
  },
  hogar: {
    organismo: 'Gobierno de Mendoza',
    documento: 'El agua en Mendoza · Fascículo 3',
    publicacion: '2021',
    pagina: 'Pág. 46',
    urlFuente: 'https://www.mendoza.gov.ar/wp-content/uploads/sites/15/2021/08/FASCICULO-03.pdf#page=46',
  },
  finca: {
    organismo: 'Departamento General de Irrigación',
    documento: 'Cálculo de Demanda Hídrica por Cuenca',
    publicacion: 'Sin fecha impresa · archivo del DGI de marzo de 2025',
    pagina: 'Pág. 1',
    urlFuente: 'https://www.irrigacion.gov.ar/web/wp-content/uploads/2025/03/Calculo-de-Demanda-Hidrica-por-Cuenca.pdf',
  },
  rios: {
    organismo: 'Departamento General de Irrigación',
    documento: 'Situación hídrica y Pronóstico de Escurrimientos 2026/2027',
    publicacion: '2 de octubre de 2026',
    pagina: 'Desglose por río y sección de aforo',
    urlFuente: 'https://www.irrigacion.gov.ar/web/2026/10/02/informe-de-la-situacion-hidrica-a-partir-del-pronostico-de-escurrimientos-temporada-2026-2027/',
  },
} as const

export const boletinDGI = 'https://www.irrigacion.gov.ar/web/pronostico/'

export type Fuente = keyof typeof fuentes
export type TipoDato = 'Medición registrada' | 'Pronóstico' | 'Referencia histórica' |
  'Estimación técnica' | 'Ejemplo educativo' | 'Resultado calculado por Gotea'

export function indicador<T extends number | string | null>(
  fuente: Fuente, id: string, nombre: string, valor: T, unidad: string,
  tipo: TipoDato, periodo: string, zona: string, notas: string,
) {
  return { ...fuentes[fuente], fuente, id, nombre, valor, unidad, categoria: fuente, tipo, periodo, zona, notas }
}
